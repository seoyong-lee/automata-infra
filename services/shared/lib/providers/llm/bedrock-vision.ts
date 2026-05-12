import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  type InvokeModelCommandOutput,
} from "@aws-sdk/client-bedrock-runtime";
import { getOptionalEnv, getSecretJson, putJsonToS3 } from "../../aws/runtime";

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

const resolveModelId = async (
  modelId: string,
  secretIdEnvVar?: string,
): Promise<string> => {
  const secretId = secretIdEnvVar?.trim()
    ? getOptionalEnv(secretIdEnvVar)
    : undefined;
  if (!secretId) {
    return modelId;
  }
  const secret = await getSecretJson<BedrockLlmSecret>(secretId);
  return secret?.modelId ?? modelId;
};

const toAnthropicImageBlock = (input: {
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  base64: string;
}) => ({
  type: "image",
  source: {
    type: "base64",
    media_type: input.mediaType,
    data: input.base64,
  },
});

export type BedrockVisionJpegPart = {
  /** JPEG bytes as base64 (no data: URL prefix) */
  base64: string;
};

/**
 * AWS Bedrock Anthropic Messages — user 메시지에 JPEG 이미지 블록을 포함해 호출한다.
 * 모델은 Vision 지원 Claude 계열이어야 한다.
 *
 * 호출부에서 S3 `GetObject`로 JPEG을 읽어 base64만 넘기면 된다 (repo 경계 유지).
 */
export const invokeBedrockAnthropicWithVisionJpegs = async (input: {
  jobId: string;
  logStepKey: string;
  modelId: string;
  secretIdEnvVar?: string;
  systemPrompt: string;
  userText: string;
  images: BedrockVisionJpegPart[];
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<{ text: string; modelId: string; logS3Key: string }> => {
  const capped = input.images.slice(0, 20);
  const model = await resolveModelId(input.modelId, input.secretIdEnvVar);
  const logS3Key = `logs/${input.jobId}/provider/bedrock-vision-${input.logStepKey}.json`;

  const userContent: Array<Record<string, unknown>> = [
    { type: "text", text: input.userText },
    ...capped.map((img) =>
      toAnthropicImageBlock({ mediaType: "image/jpeg", base64: img.base64 }),
    ),
  ];

  const requestBody = {
    anthropic_version: "bedrock-2023-05-31",
    system: input.systemPrompt,
    messages: [
      {
        role: "user",
        content: userContent,
      },
    ],
    temperature: input.temperature ?? 0.3,
    max_tokens: input.maxOutputTokens ?? 4096,
  };

  let response: InvokeModelCommandOutput;
  try {
    response = await bedrockClient.send(
      new InvokeModelCommand({
        modelId: model,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(requestBody),
      }),
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Bedrock vision (${model}, ${input.logStepKey}): ${detail}`);
  }
  if (!response.body) {
    throw new Error(`Bedrock vision returned empty body for ${input.logStepKey}`);
  }

  const raw = new TextDecoder().decode(response.body);
  const payload = JSON.parse(raw) as BedrockAnthropicResponse;
  const text = extractTextContent(payload);
  if (!text) {
    throw new Error(`Bedrock vision returned no text for ${input.logStepKey}`);
  }

  await putJsonToS3(logS3Key, {
    model,
    logStepKey: input.logStepKey,
    imageCount: capped.length,
    requestMeta: {
      systemPromptLen: input.systemPrompt.length,
      userTextLen: input.userText.length,
    },
    response: payload,
    outputTextPreview: text.slice(0, 2000),
  });

  return { text, modelId: model, logS3Key };
};
