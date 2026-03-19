import { createHash } from "crypto";
import { getSecretJson, putBufferToS3, putJsonToS3 } from "../../aws/runtime";

type OpenAiImageSecret = {
  apiKey: string;
  model?: string;
  size?: string;
  endpoint?: string;
};

const hashPrompt = (prompt: string): string => {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 12);
};

const buildSvgPlaceholder = (label: string): string => {
  const escaped = label
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="100%" height="100%" fill="#111827"/><text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" fill="#f9fafb" font-size="28" font-family="Arial">AI Pipeline Placeholder</text><text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-size="20" font-family="Arial">${escaped}</text></svg>`;
};

const putMockImage = async (
  imageKey: string,
  rawKey: string,
  prompt: string,
): Promise<Record<string, unknown>> => {
  const svg = buildSvgPlaceholder(prompt);
  await putBufferToS3(imageKey, svg, "image/svg+xml");
  await putJsonToS3(rawKey, {
    mocked: true,
    prompt,
    hash: hashPrompt(prompt),
  });

  return {
    provider: "mock",
    imageS3Key: imageKey,
    providerLogS3Key: rawKey,
    promptHash: hashPrompt(prompt),
    mocked: true,
  };
};

const persistResolvedImage = async (
  imageKey: string,
  image: { b64_json?: string; url?: string } | undefined,
  prompt: string,
): Promise<void> => {
  if (image?.b64_json) {
    await putBufferToS3(
      imageKey,
      Buffer.from(image.b64_json, "base64"),
      "image/png",
    );
    return;
  }

  if (image?.url) {
    const assetResponse = await fetch(image.url);
    const arrayBuffer = await assetResponse.arrayBuffer();
    await putBufferToS3(
      imageKey,
      Buffer.from(arrayBuffer),
      assetResponse.headers.get("content-type") ?? "image/png",
    );
    return;
  }

  const svg = buildSvgPlaceholder(prompt);
  await putBufferToS3(imageKey, svg, "image/svg+xml");
};

export const generateSceneImage = async (input: {
  jobId: string;
  sceneId: number;
  prompt: string;
  secretId: string;
}): Promise<Record<string, unknown>> => {
  const secret = await getSecretJson<OpenAiImageSecret>(input.secretId);
  const imageKey = `assets/${input.jobId}/images/scene-${input.sceneId}.png`;
  const rawKey = `logs/${input.jobId}/provider/image-scene-${input.sceneId}.json`;

  if (!secret?.apiKey) {
    return putMockImage(imageKey, rawKey, input.prompt);
  }

  const endpoint =
    secret.endpoint ?? "https://api.openai.com/v1/images/generations";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: secret.model ?? "gpt-image-1",
      size: secret.size ?? "1024x1024",
      prompt: input.prompt,
    }),
  });

  const payload = (await response.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
    error?: unknown;
  };
  await putJsonToS3(rawKey, payload);
  await persistResolvedImage(imageKey, payload.data?.[0], input.prompt);

  return {
    provider: "openai-image",
    imageS3Key: imageKey,
    providerLogS3Key: rawKey,
    promptHash: hashPrompt(input.prompt),
    mocked: false,
  };
};
