import { createHash, randomUUID } from "crypto";
import { getSecretJson, putBufferToS3, putJsonToS3 } from "../../aws/runtime";
import { fetchArrayBufferWithRetry, fetchJsonWithRetry } from "../http/retry";

type BytePlusImageSecret = {
  apiKey: string;
  model?: string;
  endpoint?: string;
  responseFormat?: "b64_json" | "url";
  watermark?: boolean;
  extraBody?: Record<string, unknown>;
};

const DEFAULT_SHORTFORM_IMAGE_SIZE = "1024x1792";
const DEFAULT_SHORTFORM_ASPECT_RATIO = "9:16";

const hashPrompt = (prompt: string): string => {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 12);
};

const buildSvgPlaceholder = (label: string): string => {
  const escaped = label
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1792"><rect width="100%" height="100%" fill="#111827"/><text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" fill="#f9fafb" font-size="28" font-family="Arial">AI Pipeline Placeholder</text><text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-size="20" font-family="Arial">${escaped}</text></svg>`;
};

const parseSize = (
  size: string,
): { width: number; height: number; aspectRatio: string } | null => {
  const [widthRaw, heightRaw] = size.split("x");
  const width = Number(widthRaw);
  const height = Number(heightRaw);
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const ratioDivisor = gcd(width, height);
  return {
    width,
    height,
    aspectRatio: `${width / ratioDivisor}:${height / ratioDivisor}`,
  };
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
    provider: "byteplus-image",
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
    const arrayBuffer = await fetchArrayBufferWithRetry(
      image.url,
      { method: "GET" },
      { maxAttempts: 3 },
    );
    await putBufferToS3(imageKey, Buffer.from(arrayBuffer), "image/png");
    return;
  }

  const svg = buildSvgPlaceholder(prompt);
  await putBufferToS3(imageKey, svg, "image/svg+xml");
};

export const generateSceneBytePlusImage = async (input: {
  jobId: string;
  sceneId: number;
  prompt: string;
  secretId: string;
}): Promise<Record<string, unknown>> => {
  const secret = await getSecretJson<BytePlusImageSecret>(input.secretId);
  const candidateId = randomUUID();
  const createdAt = new Date().toISOString();
  const imageKey = `assets/${input.jobId}/images/scene-${input.sceneId}/${candidateId}.png`;
  const rawKey = `logs/${input.jobId}/provider/byteplus-image-scene-${input.sceneId}-${candidateId}.json`;

  if (!secret?.apiKey) {
    return {
      sceneId: input.sceneId,
      ...(await putMockImage(imageKey, rawKey, input.prompt)),
    };
  }

  const endpoint =
    secret.endpoint ??
    "https://ark.ap-southeast.bytepluses.com/api/v3/images/generations";
  const sizeMeta = parseSize(DEFAULT_SHORTFORM_IMAGE_SIZE);
  const watermark =
    typeof secret.watermark === "boolean" ? secret.watermark : false;
  const requestBody = {
    model: secret.model ?? "seedream-4-0-250828",
    prompt: input.prompt,
    size: DEFAULT_SHORTFORM_IMAGE_SIZE,
    response_format: secret.responseFormat ?? "b64_json",
    ...(sizeMeta
      ? {
          width: sizeMeta.width,
          height: sizeMeta.height,
          aspect_ratio: sizeMeta.aspectRatio,
        }
      : { aspect_ratio: DEFAULT_SHORTFORM_ASPECT_RATIO }),
    watermark,
    add_watermark: watermark,
    ...(secret.extraBody ?? {}),
  };
  const payload = (await fetchJsonWithRetry(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  })) as {
    data?: Array<{ b64_json?: string; url?: string }>;
    error?: unknown;
  };
  await putJsonToS3(rawKey, {
    request: {
      endpoint,
      ...requestBody,
    },
    response: payload,
  });
  await persistResolvedImage(imageKey, payload.data?.[0], input.prompt);

  return {
    sceneId: input.sceneId,
    candidateId,
    createdAt,
    provider: "byteplus-image",
    imageS3Key: imageKey,
    providerLogS3Key: rawKey,
    promptHash: hashPrompt(input.prompt),
    mocked: false,
  };
};
