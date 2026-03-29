import { fetchArrayBufferWithRetry } from "../http/retry";
import { putBufferToS3, putJsonToS3 } from "../../aws/runtime";
import { executeBytePlusVideoTask } from "./byteplus-video-task";
import { hashPrompt, pickBytePlusVideoUrl } from "./byteplus-video-response";
import type { BytePlusVideoSecret } from "./byteplus-video-config";

const persistBytePlusVideoFile = async (
  videoKey: string,
  payload: Record<string, unknown>,
): Promise<string | undefined> => {
  const videoUrl = pickBytePlusVideoUrl(payload);
  if (!videoUrl) {
    return undefined;
  }
  const arrayBuffer = await fetchArrayBufferWithRetry(
    videoUrl,
    {
      method: "GET",
    },
    {
      maxAttempts: 3,
    },
  );
  await putBufferToS3(videoKey, Buffer.from(arrayBuffer), "video/mp4");
  return videoUrl;
};

export const putMockVideo = async (input: {
  videoKey: string;
  rawKey: string;
  prompt: string;
  targetDurationSec?: number;
  resolvedDurationSec?: number;
}): Promise<Record<string, unknown>> => {
  const mocked = {
    mocked: true,
    prompt: input.prompt,
    clipManifest: true,
    provider: "byteplus-video",
    targetDurationSec: input.targetDurationSec,
    resolvedDurationSec: input.resolvedDurationSec,
  };
  await putJsonToS3(input.videoKey, mocked);
  await putJsonToS3(input.rawKey, mocked);

  return {
    provider: "mock",
    videoClipS3Key: input.videoKey,
    providerLogS3Key: input.rawKey,
    promptHash: hashPrompt(input.prompt),
    mocked: true,
    targetDurationSec: input.targetDurationSec,
    resolvedDurationSec: input.resolvedDurationSec,
  };
};

const persistBytePlusVideoResult = async (input: {
  rawKey: string;
  videoKey: string;
  submitted: Record<string, unknown>;
  payload: Record<string, unknown>;
  endpoint: string;
  queryEndpoint?: string;
  model: string;
  promptField: string;
  imageField?: string;
  requestMeta: Record<string, unknown>;
  sourceVideoUrl?: string;
  targetDurationSec?: number;
  resolvedDurationSec?: number;
  selectedImageS3Key?: string;
  selectedImageDataUri?: string;
}): Promise<void> => {
  await putJsonToS3(input.rawKey, {
    submit: input.submitted,
    final: input.payload,
    endpoint: input.endpoint,
    queryEndpoint: input.queryEndpoint,
    model: input.model,
    promptField: input.promptField,
    imageField: input.imageField,
    requestMeta: input.requestMeta,
    sourceVideoUrl: input.sourceVideoUrl,
    targetDurationSec: input.targetDurationSec,
    resolvedDurationSec: input.resolvedDurationSec,
    selectedImageS3Key: input.selectedImageS3Key,
    selectedImageAttached: Boolean(input.selectedImageDataUri),
  });
};

export const failBytePlusVideo = async (input: {
  rawKey: string;
  endpoint: string;
  queryEndpoint: string;
  model: string;
  promptField: string;
  imageField?: string;
  targetDurationSec?: number;
  resolvedDurationSec?: number;
  selectedImageS3Key?: string;
  selectedImageDataUri?: string;
  requestMeta?: Record<string, unknown>;
  prompt: string;
  error: unknown;
}): Promise<never> => {
  const message =
    input.error instanceof Error ? input.error.message : String(input.error);
  await putJsonToS3(input.rawKey, {
    status: "ERROR",
    endpoint: input.endpoint,
    queryEndpoint: input.queryEndpoint,
    model: input.model,
    promptField: input.promptField,
    imageField: input.imageField,
    targetDurationSec: input.targetDurationSec,
    resolvedDurationSec: input.resolvedDurationSec,
    normalizedEndpoint: input.endpoint,
    normalizedQueryEndpoint: input.queryEndpoint,
    selectedImageS3Key: input.selectedImageS3Key,
    selectedImageAttached: Boolean(input.selectedImageDataUri),
    requestMeta: input.requestMeta,
    promptPreview: input.prompt.slice(0, 300),
    error: message,
  });
  throw new Error(
    `BytePlus video generation failed: model=${input.model}, endpoint=${input.endpoint}, queryEndpoint=${input.queryEndpoint}, promptField=${input.promptField}, imageField=${input.imageField ?? "none"}, selectedImage=${input.selectedImageS3Key ?? "none"}, selectedImageAttached=${Boolean(input.selectedImageDataUri)}, pollIntervalMs=${String(input.requestMeta?.pollIntervalMs ?? "unknown")}, pollTimeoutMs=${String(input.requestMeta?.pollTimeoutMs ?? "unknown")}, requestShape=${String(input.requestMeta?.requestShape ?? "unknown")}, logKey=${input.rawKey}, error=${message}`,
  );
};

export const completeBytePlusVideo = async (input: {
  secret: BytePlusVideoSecret & { apiKey: string };
  endpoint: string;
  queryEndpointTemplate: string;
  videoKey: string;
  rawKey: string;
  model: string;
  promptField: string;
  imageField?: string;
  prompt: string;
  targetDurationSec?: number;
  selectedImageS3Key?: string;
  selectedImageDataUri?: string;
}): Promise<Record<string, unknown>> => {
  const { submitted, payload, resolvedQueryEndpoint, requestMeta } =
    await executeBytePlusVideoTask({
      secret: input.secret,
      endpoint: input.endpoint,
      queryEndpointTemplate: input.queryEndpointTemplate,
      prompt: input.prompt,
      targetDurationSec: input.targetDurationSec,
      selectedImageDataUri: input.selectedImageDataUri,
    });
  const sourceVideoUrl = await persistBytePlusVideoFile(
    input.videoKey,
    payload,
  );
  if (!sourceVideoUrl) {
    throw new Error(
      "BytePlus response did not include a downloadable video URL",
    );
  }
  await persistBytePlusVideoResult({
    rawKey: input.rawKey,
    videoKey: input.videoKey,
    submitted,
    payload,
    endpoint: input.endpoint,
    queryEndpoint: resolvedQueryEndpoint,
    model: input.model,
    promptField: input.promptField,
    imageField: input.imageField,
    requestMeta,
    sourceVideoUrl,
    targetDurationSec: input.targetDurationSec,
    resolvedDurationSec: requestMeta.duration as number | undefined,
    selectedImageS3Key: input.selectedImageS3Key,
    selectedImageDataUri: input.selectedImageDataUri,
  });

  return {
    provider: "byteplus-video",
    videoClipS3Key: input.videoKey,
    providerLogS3Key: input.rawKey,
    promptHash: hashPrompt(input.prompt),
    mocked: false,
    targetDurationSec: input.targetDurationSec,
    resolvedDurationSec:
      typeof requestMeta.duration === "number"
        ? requestMeta.duration
        : undefined,
  };
};
