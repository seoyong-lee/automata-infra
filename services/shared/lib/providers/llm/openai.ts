import { getOptionalEnv, getSecretJson, putJsonToS3 } from "../../aws/runtime";
import { parseJsonFromLlmText } from "../../llm/parse-json-from-llm-text";
import { fetchJsonWithRetry } from "../http/retry";
import type {
  GenerateStructuredDataResult,
  LlmPromptTemplate,
  LlmStepConfig,
} from "../../llm/types";

type OpenAiTextSecret = {
  apiKey: string;
  organization?: string;
  project?: string;
  llmModel?: string;
  llmEndpoint?: string;
};

type OpenAiChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
};

const extractMessageContent = (
  payload: OpenAiChatCompletionResponse,
): string | null => {
  const content = payload.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    const text = content
      .map((entry) => entry.text ?? "")
      .join("")
      .trim();
    return text.length > 0 ? text : null;
  }

  return null;
};

const buildLogKey = (jobId: string, stepKey: string): string => {
  return `logs/${jobId}/provider/llm-${stepKey}.json`;
};

const buildMetadata = <T>(input: {
  provider: string;
  model: string;
  mocked: boolean;
  template: LlmPromptTemplate;
  logKey: string;
}): GenerateStructuredDataResult<T>["metadata"] => {
  return {
    provider: input.provider,
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
      provider: "mock",
      model: input.model,
      mocked: true,
      template: input.template,
      logKey: input.logKey,
    }),
  };
};

const resolveOpenAiSecret = async (
  config: LlmStepConfig,
): Promise<{
  secretId?: string;
  secret?: OpenAiTextSecret | null;
}> => {
  const secretId = getOptionalEnv(config.secretIdEnvVar);

  if (!secretId) {
    return {};
  }

  return {
    secretId,
    secret: await getSecretJson<OpenAiTextSecret>(secretId),
  };
};

const requestOpenAiPayload = async (input: {
  secret: OpenAiTextSecret;
  prompt: string;
  template: LlmPromptTemplate;
  config: LlmStepConfig;
}): Promise<{
  endpoint: string;
  model: string;
  requestBody: Record<string, unknown>;
  payload: OpenAiChatCompletionResponse;
}> => {
  const endpoint =
    input.secret.llmEndpoint ?? "https://api.openai.com/v1/chat/completions";
  const model = input.secret.llmModel ?? input.config.model;
  const requestBody = {
    model,
    temperature: input.config.temperature,
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "system",
        content: input.template.systemPrompt,
      },
      {
        role: "user",
        content: input.prompt,
      },
    ],
  };

  const payload = await fetchJsonWithRetry<OpenAiChatCompletionResponse>(
    endpoint,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.secret.apiKey}`,
        "Content-Type": "application/json",
        ...(input.secret.organization
          ? { "OpenAI-Organization": input.secret.organization }
          : {}),
        ...(input.secret.project
          ? { "OpenAI-Project": input.secret.project }
          : {}),
      },
      body: JSON.stringify(requestBody),
    },
    {
      maxAttempts: 3,
    },
  );

  return {
    endpoint,
    model,
    requestBody,
    payload,
  };
};

export const generateOpenAiStructuredData = async <T>(input: {
  jobId: string;
  stepKey: string;
  prompt: string;
  template: LlmPromptTemplate;
  config: LlmStepConfig;
  validate: (payload: unknown) => T;
  buildMockResult: () => T;
}): Promise<GenerateStructuredDataResult<T>> => {
  const logKey = buildLogKey(input.jobId, input.stepKey);
  const { secretId, secret } = await resolveOpenAiSecret(input.config);

  if (!secretId) {
    return buildMockResponse({
      logKey,
      reason: `Missing env ${input.config.secretIdEnvVar}`,
      prompt: input.prompt,
      template: input.template,
      model: input.config.model,
      buildMockResult: input.buildMockResult,
    });
  }

  if (!secret?.apiKey) {
    return buildMockResponse({
      logKey,
      reason: `Missing apiKey in secret ${secretId}`,
      prompt: input.prompt,
      template: input.template,
      model: input.config.model,
      buildMockResult: input.buildMockResult,
    });
  }

  const { endpoint, model, requestBody, payload } = await requestOpenAiPayload({
    secret,
    prompt: input.prompt,
    template: input.template,
    config: input.config,
  });
  const content = extractMessageContent(payload);

  if (!content) {
    throw new Error(`OpenAI returned no content for ${input.stepKey}`);
  }

  const parsed = parseJsonFromLlmText(content);
  const output = input.validate(parsed);

  await putJsonToS3(logKey, {
    mocked: false,
    endpoint,
    model,
    promptVersion: input.template.version,
    requestBody,
    response: payload,
    output,
  });

  return {
    output,
    metadata: buildMetadata({
      provider: "openai",
      model,
      mocked: false,
      template: input.template,
      logKey,
    }),
  };
};
