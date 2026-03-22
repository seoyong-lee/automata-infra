import { createHash } from "crypto";
import { getSecretJson, putBufferToS3, putJsonToS3 } from "../../aws/runtime";
import {
  fetchArrayBufferWithRetry,
  fetchJsonWithRetry,
  pollUntil,
} from "../http/retry";

type RunwayVideoSecret = {
  apiKey: string;
  endpoint?: string;
  model?: string;
  imageField?: string;
};

const hashPrompt = (prompt: string): string => {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 12);
};

const DONE_STATUSES = new Set(["succeeded", "completed", "done", "success"]);
const FAILED_STATUSES = new Set(["failed", "error", "cancelled", "canceled"]);

const getStatus = (payload: Record<string, unknown>): string => {
  return typeof payload.status === "string" ? payload.status.toLowerCase() : "";
};

const getGenerationId = (payload: Record<string, unknown>): string | null => {
  if (typeof payload.id === "string") {
    return payload.id;
  }
  if (typeof payload.taskId === "string") {
    return payload.taskId;
  }
  return null;
};

const submitRunwayGeneration = async (input: {
  endpoint: string;
  headers: Record<string, string>;
  model: string;
  prompt: string;
  imageField?: string;
  selectedImageDataUri?: string;
}): Promise<Record<string, unknown>> => {
  return fetchJsonWithRetry<Record<string, unknown>>(input.endpoint, {
    method: "POST",
    headers: input.headers,
    body: JSON.stringify({
      model: input.model,
      promptText: input.prompt,
      ...(input.imageField && input.selectedImageDataUri
        ? { [input.imageField]: input.selectedImageDataUri }
        : {}),
    }),
  });
};

const pollRunwayGeneration = async (input: {
  endpoint: string;
  generationId: string;
  headers: Record<string, string>;
}): Promise<Record<string, unknown>> => {
  const statusEndpoint = `${input.endpoint}/${input.generationId}`;
  return pollUntil<Record<string, unknown>>({
    fetcher: () =>
      fetchJsonWithRetry<Record<string, unknown>>(statusEndpoint, {
        method: "GET",
        headers: input.headers,
      }),
    isDone: (current) => DONE_STATUSES.has(getStatus(current)),
    isFailed: (current) => FAILED_STATUSES.has(getStatus(current)),
    getStatus: (current) =>
      typeof current.status === "string" ? current.status : "unknown",
    intervalMs: 3000,
    timeoutMs: 90000,
  });
};

type RunwayVideoInput = {
  jobId: string;
  sceneId: number;
  prompt: string;
  selectedImageS3Key?: string;
  selectedImageDataUri?: string;
  secretId: string;
};

type RunwayVideoContext = {
  endpoint: string;
  model: string;
  imageField?: string;
  headers: Record<string, string>;
  videoKey: string;
  rawKey: string;
};

const collectStringUrls = (value: unknown): string[] => {
  if (typeof value === "string") {
    return /^https?:\/\//.test(value) ? [value] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectStringUrls(item));
  }
  if (value && typeof value === "object") {
    return Object.values(value).flatMap((item) => collectStringUrls(item));
  }
  return [];
};

const pickVideoUrl = (payload: Record<string, unknown>): string | undefined => {
  const candidates = collectStringUrls(payload);
  return (
    candidates.find((url) => /\.(mp4|mov|webm)(\?|$)/i.test(url)) ??
    candidates.find((url) => /video/i.test(url)) ??
    candidates[0]
  );
};

const persistVideoFile = async (
  videoKey: string,
  payload: Record<string, unknown>,
): Promise<string | undefined> => {
  const videoUrl = pickVideoUrl(payload);
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

const resolveRunwayVideoContext = (
  input: Omit<RunwayVideoInput, "secretId">,
  secret: RunwayVideoSecret & { apiKey: string },
): RunwayVideoContext => {
  return {
    endpoint:
      secret.endpoint ?? "https://api.dev.runwayml.com/v1/video_generations",
    model: secret.model ?? "gen4_turbo",
    imageField:
      input.selectedImageDataUri !== undefined
        ? secret.imageField?.trim() || "promptImage"
        : undefined,
    headers: {
      Authorization: `Bearer ${secret.apiKey}`,
      "Content-Type": "application/json",
      "X-Runway-Version": "2024-11-06",
    },
    videoKey: `assets/${input.jobId}/videos/scene-${input.sceneId}.mp4`,
    rawKey: `logs/${input.jobId}/provider/video-scene-${input.sceneId}.json`,
  };
};

const persistRunwayVideoResult = async (input: {
  rawKey: string;
  videoKey: string;
  submitted: Record<string, unknown>;
  payload: Record<string, unknown>;
  endpoint: string;
  model: string;
  imageField?: string;
  sourceVideoUrl?: string;
  selectedImageS3Key?: string;
  selectedImageDataUri?: string;
}): Promise<void> => {
  await putJsonToS3(input.rawKey, {
    submit: input.submitted,
    final: input.payload,
    endpoint: input.endpoint,
    model: input.model,
    imageField: input.imageField,
    sourceVideoUrl: input.sourceVideoUrl,
    selectedImageS3Key: input.selectedImageS3Key,
    selectedImageAttached: Boolean(input.selectedImageDataUri),
  });
};

const putMockRunwayVideo = async (input: {
  videoKey: string;
  rawKey: string;
  prompt: string;
}): Promise<Record<string, unknown>> => {
  const mocked = {
    mocked: true,
    prompt: input.prompt,
    clipManifest: true,
  };
  await putJsonToS3(input.videoKey, mocked);
  await putJsonToS3(input.rawKey, mocked);
  return {
    provider: "mock",
    videoClipS3Key: input.videoKey,
    providerLogS3Key: input.rawKey,
    promptHash: hashPrompt(input.prompt),
    mocked: true,
  };
};

const failRunwayVideo = async (input: {
  rawKey: string;
  endpoint: string;
  model: string;
  imageField?: string;
  selectedImageS3Key?: string;
  selectedImageDataUri?: string;
  prompt: string;
  error: unknown;
}): Promise<never> => {
  const message =
    input.error instanceof Error ? input.error.message : String(input.error);
  await putJsonToS3(input.rawKey, {
    status: "ERROR",
    endpoint: input.endpoint,
    model: input.model,
    imageField: input.imageField,
    selectedImageS3Key: input.selectedImageS3Key,
    selectedImageAttached: Boolean(input.selectedImageDataUri),
    promptPreview: input.prompt.slice(0, 300),
    error: message,
  });
  throw new Error(
    `Runway video generation failed: model=${input.model}, endpoint=${input.endpoint}, imageField=${input.imageField ?? "none"}, selectedImage=${input.selectedImageS3Key ?? "none"}, logKey=${input.rawKey}, error=${message}`,
  );
};

const completeRunwayVideo = async (input: {
  context: RunwayVideoContext;
  prompt: string;
  selectedImageS3Key?: string;
  selectedImageDataUri?: string;
}): Promise<Record<string, unknown>> => {
  const submitted = await submitRunwayGeneration({
    endpoint: input.context.endpoint,
    headers: input.context.headers,
    model: input.context.model,
    prompt: input.prompt,
    imageField: input.context.imageField,
    selectedImageDataUri: input.selectedImageDataUri,
  });
  const generationId = getGenerationId(submitted);
  let payload: Record<string, unknown> = submitted;
  const initialStatus = getStatus(submitted);

  if (generationId && !DONE_STATUSES.has(initialStatus)) {
    payload = await pollRunwayGeneration({
      endpoint: input.context.endpoint,
      generationId,
      headers: input.context.headers,
    });
  }
  const sourceVideoUrl = await persistVideoFile(
    input.context.videoKey,
    payload,
  );
  if (!sourceVideoUrl) {
    throw new Error("Runway response did not include a downloadable video URL");
  }

  await persistRunwayVideoResult({
    rawKey: input.context.rawKey,
    videoKey: input.context.videoKey,
    submitted,
    payload,
    endpoint: input.context.endpoint,
    model: input.context.model,
    imageField: input.context.imageField,
    sourceVideoUrl,
    selectedImageS3Key: input.selectedImageS3Key,
    selectedImageDataUri: input.selectedImageDataUri,
  });

  return {
    provider: "runway-video",
    videoClipS3Key: input.context.videoKey,
    providerLogS3Key: input.context.rawKey,
    promptHash: hashPrompt(input.prompt),
    mocked: false,
  };
};

export const generateSceneVideo = async (
  input: RunwayVideoInput,
): Promise<Record<string, unknown>> => {
  const secret = await getSecretJson<RunwayVideoSecret>(input.secretId);
  const fallbackContext = resolveRunwayVideoContext(
    input,
    secret ?? { apiKey: "" },
  );

  if (!secret?.apiKey) {
    return putMockRunwayVideo({
      videoKey: fallbackContext.videoKey,
      rawKey: fallbackContext.rawKey,
      prompt: input.prompt,
    });
  }

  const context = resolveRunwayVideoContext(input, secret);
  try {
    return await completeRunwayVideo({
      context,
      prompt: input.prompt,
      selectedImageS3Key: input.selectedImageS3Key,
      selectedImageDataUri: input.selectedImageDataUri,
    });
  } catch (error) {
    return failRunwayVideo({
      rawKey: context.rawKey,
      endpoint: context.endpoint,
      model: context.model,
      imageField: context.imageField,
      selectedImageS3Key: input.selectedImageS3Key,
      selectedImageDataUri: input.selectedImageDataUri,
      prompt: input.prompt,
      error,
    });
  }
};
