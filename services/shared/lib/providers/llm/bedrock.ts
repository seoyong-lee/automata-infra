import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  type InvokeModelCommandOutput,
} from "@aws-sdk/client-bedrock-runtime";
import { getOptionalEnv, getSecretJson, putJsonToS3 } from "../../aws/runtime";
import { parseJsonFromLlmText } from "../../llm/parse-json-from-llm-text";
import type {
  GenerateStructuredDataResult,
  LlmPromptTemplate,
  LlmStepConfig,
} from "../../llm/types";

type BedrockLlmSecret = {
  modelId?: string;
};

type BedrockAnthropicResponse = {
  content?: Array<{
    type?: string;
    text?: string;
  }>;
};

const region = process.env.AWS_REGION ?? "ap-northeast-2";
const bedrockClient = new BedrockRuntimeClient({ region });

const extractTextContent = (
  payload: BedrockAnthropicResponse,
): string | null => {
  const content = payload.content;
  if (!Array.isArray(content)) {
    return null;
  }

  const merged = content
    .map((entry) => (entry.type === "text" ? (entry.text ?? "") : ""))
    .join("")
    .trim();

  return merged.length > 0 ? merged : null;
};

const buildLogKey = (jobId: string, stepKey: string): string => {
  return `logs/${jobId}/provider/llm-${stepKey}.json`;
};

const buildMetadata = <T>(input: {
  model: string;
  mocked: boolean;
  template: LlmPromptTemplate;
  logKey: string;
}): GenerateStructuredDataResult<T>["metadata"] => {
  return {
    provider: input.mocked ? "mock" : "bedrock",
    model: input.model,
    mocked: input.mocked,
    promptVersion: input.template.version,
    providerLogS3Key: input.logKey,
  };
};

const buildMockResponse = async <T>(input: {
  logKey: string;
  reason: string;
  prompt: string;
  template: LlmPromptTemplate;
  model: string;
  buildMockResult: () => T;
}): Promise<GenerateStructuredDataResult<T>> => {
  const output = input.buildMockResult();
  await putJsonToS3(input.logKey, {
    mocked: true,
    reason: input.reason,
    promptVersion: input.template.version,
    prompt: input.prompt,
    output,
  });

  return {
    output,
    metadata: buildMetadata({
      model: input.model,
      mocked: true,
      template: input.template,
      logKey: input.logKey,
    }),
  };
};

const resolveModel = async (config: LlmStepConfig): Promise<string> => {
  const secretId = getOptionalEnv(config.secretIdEnvVar);
  if (!secretId) {
    return config.model;
  }

  const secret = await getSecretJson<BedrockLlmSecret>(secretId);
  return secret?.modelId ?? config.model;
};

const requestBedrockPayload = async (input: {
  stepKey: string;
  prompt: string;
  template: LlmPromptTemplate;
  config: LlmStepConfig;
  model: string;
}): Promise<{
  requestBody: Record<string, unknown>;
  payload: BedrockAnthropicResponse;
}> => {
  const requestBody = {
    anthropic_version: "bedrock-2023-05-31",
    system: input.template.systemPrompt,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: input.prompt,
          },
        ],
      },
    ],
    temperature: input.config.temperature,
    max_tokens: input.config.maxOutputTokens ?? 2400,
  };

  let response: InvokeModelCommandOutput;
  try {
    response = await bedrockClient.send(
      new InvokeModelCommand({
        modelId: input.model,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(requestBody),
      }),
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Bedrock (${input.model}, ${input.stepKey}): ${detail}`);
  }
  if (!response.body) {
    throw new Error(`Bedrock returned empty body for ${input.stepKey}`);
  }

  const raw = new TextDecoder().decode(response.body);
  return {
    requestBody,
    payload: JSON.parse(raw) as BedrockAnthropicResponse,
  };
};

export const generateBedrockStructuredData = async <T>(input: {
  jobId: string;
  stepKey: string;
  prompt: string;
  template: LlmPromptTemplate;
  config: LlmStepConfig;
  validate: (payload: unknown) => T;
  buildMockResult: () => T;
}): Promise<GenerateStructuredDataResult<T>> => {
  const logKey = buildLogKey(input.jobId, input.stepKey);
  const model = await resolveModel(input.config);
  if (!model) {
    return buildMockResponse({
      logKey,
      reason: "Missing Bedrock model",
      prompt: input.prompt,
      template: input.template,
      model: input.config.model,
      buildMockResult: input.buildMockResult,
    });
  }

  const { requestBody, payload } = await requestBedrockPayload({
    stepKey: input.stepKey,
    prompt: input.prompt,
    template: input.template,
    config: input.config,
    model,
  });
  const content = extractTextContent(payload);
  if (!content) {
    throw new Error(`Bedrock returned no text content for ${input.stepKey}`);
  }

  const parsed = parseJsonFromLlmText(content);
  const output = input.validate(parsed);

  await putJsonToS3(logKey, {
    mocked: false,
    model,
    promptVersion: input.template.version,
    requestBody,
    response: payload,
    output,
  });

  return {
    output,
    metadata: buildMetadata({
      model,
      mocked: false,
      template: input.template,
      logKey,
    }),
  };
};
