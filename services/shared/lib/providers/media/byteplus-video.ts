import { createHash } from "crypto";
import { getSecretJson, putBufferToS3, putJsonToS3 } from "../../aws/runtime";
import {
  fetchArrayBufferWithRetry,
  fetchJsonWithRetry,
  pollUntil,
} from "../http/retry";

type BytePlusVideoSecret = {
  apiKey: string;
  model?: string;
  endpoint?: string;
  queryEndpoint?: string;
  promptField?: string;
  imageField?: string;
  pollIntervalMs?: number;
  pollTimeoutMs?: number;
  ratio?: string;
  duration?: number;
  supportedDurations?: number[];
  resolution?: string;
  watermark?: boolean;
  generateAudio?: boolean;
  extraBody?: Record<string, unknown>;
};

const DONE_STATUSES = new Set(["succeeded", "completed", "done", "success"]);
const FAILED_STATUSES = new Set(["failed", "error", "cancelled", "canceled"]);
const DEFAULT_CREATE_ENDPOINT =
  "https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks";
const DEFAULT_QUERY_ENDPOINT =
  "https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks/{id}";
const DEFAULT_POLL_INTERVAL_MS = 3000;
const DEFAULT_POLL_TIMEOUT_MS = 600000;

const hashPrompt = (prompt: string): string => {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 12);
};

const getStatus = (payload: Record<string, unknown>): string => {
  if (typeof payload.status === "string") {
    return payload.status.toLowerCase();
  }
  if (typeof payload.state === "string") {
    return payload.state.toLowerCase();
  }
  if (typeof payload.task_status === "string") {
    return payload.task_status.toLowerCase();
  }
  return "";
};

const getTaskId = (payload: Record<string, unknown>): string | null => {
  if (typeof payload.id === "string") {
    return payload.id;
  }
  if (typeof payload.taskId === "string") {
    return payload.taskId;
  }
  if (typeof payload.task_id === "string") {
    return payload.task_id;
  }
  return null;
};

const getRequiredEndpoint = (secret: BytePlusVideoSecret): string => {
  const endpoint = secret.endpoint?.trim();
  if (!endpoint) {
    return DEFAULT_CREATE_ENDPOINT;
  }
  if (endpoint.includes("/video/generations")) {
    return DEFAULT_CREATE_ENDPOINT;
  }
  return endpoint;
};

const getRequiredQueryEndpoint = (secret: BytePlusVideoSecret): string => {
  const queryEndpoint = secret.queryEndpoint?.trim();
  if (!queryEndpoint) {
    return DEFAULT_QUERY_ENDPOINT;
  }
  if (queryEndpoint.includes("/video/generations")) {
    return DEFAULT_QUERY_ENDPOINT;
  }
  return queryEndpoint;
};

const resolveQueryEndpoint = (
  endpoint: string,
  queryEndpoint: string | undefined,
  taskId: string,
): string => {
  if (queryEndpoint?.includes("{id}")) {
    return queryEndpoint.replace("{id}", encodeURIComponent(taskId));
  }
  if (queryEndpoint?.trim()) {
    return `${queryEndpoint.replace(/\/$/, "")}/${encodeURIComponent(taskId)}`;
  }
  return `${endpoint.replace(/\/$/, "")}/${encodeURIComponent(taskId)}`;
};

const resolveVideoModel = (secret: BytePlusVideoSecret): string => {
  return secret.model ?? "seedance-1-0-lite-250528";
};

const resolvePromptField = (secret: BytePlusVideoSecret): string => {
  return secret.promptField?.trim() || "prompt";
};

const resolveRatio = (
  secret: BytePlusVideoSecret,
  hasImage: boolean,
): string => {
  return secret.ratio?.trim() || (hasImage ? "adaptive" : "9:16");
};

const DEFAULT_SUPPORTED_DURATIONS_SEC = [5, 8, 10] as const;

const resolveSupportedDurations = (secret: BytePlusVideoSecret): number[] => {
  const configured = Array.isArray(secret.supportedDurations)
    ? secret.supportedDurations.filter(
        (value): value is number =>
          typeof value === "number" && Number.isFinite(value) && value > 0,
      )
    : [];
  const fallback =
    typeof secret.duration === "number" && Number.isFinite(secret.duration)
      ? [Math.ceil(secret.duration)]
      : [];
  return [
    ...new Set([
      ...configured,
      ...fallback,
      ...DEFAULT_SUPPORTED_DURATIONS_SEC,
    ]),
  ].sort((left, right) => left - right);
};

export const resolveRequestedBytePlusDurationSec = (input: {
  secret: BytePlusVideoSecret;
  targetDurationSec?: number;
}): number => {
  const supportedDurations = resolveSupportedDurations(input.secret);
  const preferredDuration =
    typeof input.secret.duration === "number" &&
    Number.isFinite(input.secret.duration)
      ? Math.ceil(input.secret.duration)
      : (supportedDurations[0] ?? 5);
  if (
    typeof input.targetDurationSec !== "number" ||
    !Number.isFinite(input.targetDurationSec) ||
    input.targetDurationSec <= 0
  ) {
    return preferredDuration;
  }
  const roundedTarget = Math.ceil(input.targetDurationSec);
  return (
    supportedDurations.find((value) => value >= roundedTarget) ??
    supportedDurations[supportedDurations.length - 1] ??
    preferredDuration
  );
};

const resolveResolution = (secret: BytePlusVideoSecret): string => {
  return secret.resolution?.trim() || "720p";
};

const resolvePositiveInteger = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return undefined;
};

const resolvePollIntervalMs = (secret: BytePlusVideoSecret): number => {
  return (
    resolvePositiveInteger(secret.pollIntervalMs) ??
    resolvePositiveInteger(process.env.BYTEPLUS_VIDEO_POLL_INTERVAL_MS) ??
    DEFAULT_POLL_INTERVAL_MS
  );
};

const resolvePollTimeoutMs = (secret: BytePlusVideoSecret): number => {
  return (
    resolvePositiveInteger(secret.pollTimeoutMs) ??
    resolvePositiveInteger(process.env.BYTEPLUS_VIDEO_POLL_TIMEOUT_MS) ??
    DEFAULT_POLL_TIMEOUT_MS
  );
};

const resolveGenerateAudio = (
  secret: BytePlusVideoSecret,
): boolean | undefined => {
  return typeof secret.generateAudio === "boolean"
    ? secret.generateAudio
    : undefined;
};

const resolveWatermark = (secret: BytePlusVideoSecret): boolean | undefined => {
  return typeof secret.watermark === "boolean" ? secret.watermark : false;
};

const buildBytePlusRequestMeta = (input: {
  secret: BytePlusVideoSecret;
  targetDurationSec?: number;
  selectedImageDataUri?: string;
}): Record<string, unknown> => {
  const imageField = input.secret.imageField?.trim();
  const promptField = resolvePromptField(input.secret);
  const ratio = resolveRatio(input.secret, Boolean(input.selectedImageDataUri));
  const duration = resolveRequestedBytePlusDurationSec({
    secret: input.secret,
    targetDurationSec: input.targetDurationSec,
  });
  const resolution = resolveResolution(input.secret);
  const generateAudio = resolveGenerateAudio(input.secret);
  const watermark = resolveWatermark(input.secret);
  return {
    promptField,
    imageField,
    ratio,
    targetDurationSec: input.targetDurationSec,
    supportedDurations: resolveSupportedDurations(input.secret),
    duration,
    resolution,
    generateAudio,
    watermark,
    attachedAsContentRole: input.selectedImageDataUri ? "first_frame" : null,
    selectedImageAttached: Boolean(input.selectedImageDataUri),
    pollIntervalMs: resolvePollIntervalMs(input.secret),
    pollTimeoutMs: resolvePollTimeoutMs(input.secret),
    requestShape: "content",
  };
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

const pickBytePlusVideoUrl = (
  payload: Record<string, unknown>,
): string | undefined => {
  const content =
    payload.content && typeof payload.content === "object"
      ? (payload.content as Record<string, unknown>)
      : undefined;
  const preferred = [
    content?.video_url,
    content?.videoUrl,
    payload.video_url,
    payload.videoUrl,
    payload.url,
  ];
  for (const candidate of preferred) {
    if (typeof candidate === "string" && /^https?:\/\//.test(candidate)) {
      return candidate;
    }
  }
  const candidates = collectStringUrls(payload);
  return (
    candidates.find((url) => /\.(mp4|mov|webm)(\?|$)/i.test(url)) ??
    candidates.find((url) => /video/i.test(url)) ??
    candidates[0]
  );
};

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

const submitBytePlusVideoTask = async (input: {
  endpoint: string;
  apiKey: string;
  model: string;
  prompt: string;
  promptField: string;
  imageField?: string;
  selectedImageDataUri?: string;
  ratio: string;
  duration: number;
  resolution: string;
  watermark?: boolean;
  generateAudio?: boolean;
  extraBody?: Record<string, unknown>;
}): Promise<Record<string, unknown>> => {
  const content: Array<Record<string, unknown>> = [
    {
      type: "text",
      text: input.prompt,
    },
  ];
  if (input.selectedImageDataUri) {
    content.push({
      type: "image_url",
      image_url: { url: input.selectedImageDataUri },
      role: "first_frame",
    });
  }
  return fetchJsonWithRetry<Record<string, unknown>>(input.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      content,
      ratio: input.ratio,
      duration: input.duration,
      resolution: input.resolution,
      ...(input.generateAudio !== undefined
        ? { generate_audio: input.generateAudio }
        : {}),
      ...(input.watermark !== undefined ? { watermark: input.watermark } : {}),
      ...(input.extraBody ?? {}),
    }),
  });
};

const putMockVideo = async (input: {
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

const failBytePlusVideo = async (input: {
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

const completeBytePlusVideo = async (input: {
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

const executeBytePlusVideoTask = async (input: {
  secret: BytePlusVideoSecret & { apiKey: string };
  endpoint: string;
  queryEndpointTemplate: string;
  prompt: string;
  targetDurationSec?: number;
  selectedImageDataUri?: string;
}): Promise<{
  submitted: Record<string, unknown>;
  payload: Record<string, unknown>;
  resolvedQueryEndpoint?: string;
  requestMeta: Record<string, unknown>;
}> => {
  const requestMeta = buildBytePlusRequestMeta({
    secret: input.secret,
    targetDurationSec: input.targetDurationSec,
    selectedImageDataUri: input.selectedImageDataUri,
  });
  const submitted = await submitBytePlusVideoTask({
    endpoint: input.endpoint,
    apiKey: input.secret.apiKey,
    model: resolveVideoModel(input.secret),
    prompt: input.prompt,
    promptField:
      typeof requestMeta.promptField === "string"
        ? requestMeta.promptField
        : "",
    imageField:
      typeof requestMeta.imageField === "string"
        ? requestMeta.imageField
        : undefined,
    selectedImageDataUri: input.selectedImageDataUri,
    ratio: typeof requestMeta.ratio === "string" ? requestMeta.ratio : "9:16",
    duration:
      typeof requestMeta.duration === "number" ? requestMeta.duration : 5,
    resolution:
      typeof requestMeta.resolution === "string"
        ? requestMeta.resolution
        : "720p",
    generateAudio:
      typeof requestMeta.generateAudio === "boolean"
        ? requestMeta.generateAudio
        : undefined,
    watermark:
      typeof requestMeta.watermark === "boolean"
        ? requestMeta.watermark
        : undefined,
    extraBody: input.secret.extraBody,
  });
  const taskId = getTaskId(submitted);
  let payload: Record<string, unknown> = submitted;
  const initialStatus = getStatus(submitted);
  const resolvedQueryEndpoint = taskId
    ? resolveQueryEndpoint(input.endpoint, input.queryEndpointTemplate, taskId)
    : undefined;

  if (resolvedQueryEndpoint && !DONE_STATUSES.has(initialStatus)) {
    payload = await pollBytePlusVideoTask({
      endpoint: resolvedQueryEndpoint,
      apiKey: input.secret.apiKey,
      intervalMs:
        typeof requestMeta.pollIntervalMs === "number"
          ? requestMeta.pollIntervalMs
          : DEFAULT_POLL_INTERVAL_MS,
      timeoutMs:
        typeof requestMeta.pollTimeoutMs === "number"
          ? requestMeta.pollTimeoutMs
          : DEFAULT_POLL_TIMEOUT_MS,
    });
  }

  return {
    submitted,
    payload,
    resolvedQueryEndpoint,
    requestMeta,
  };
};

const pollBytePlusVideoTask = async (input: {
  endpoint: string;
  apiKey: string;
  intervalMs: number;
  timeoutMs: number;
}): Promise<Record<string, unknown>> => {
  return pollUntil<Record<string, unknown>>({
    fetcher: () =>
      fetchJsonWithRetry<Record<string, unknown>>(input.endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          "Content-Type": "application/json",
        },
      }),
    isDone: (payload) => DONE_STATUSES.has(getStatus(payload)),
    isFailed: (payload) => FAILED_STATUSES.has(getStatus(payload)),
    getStatus: (payload) =>
      typeof payload.status === "string"
        ? payload.status
        : typeof payload.state === "string"
          ? payload.state
          : typeof payload.task_status === "string"
            ? payload.task_status
            : "unknown",
    intervalMs: input.intervalMs,
    timeoutMs: input.timeoutMs,
  });
};

export const generateSceneBytePlusVideo = async (input: {
  jobId: string;
  sceneId: number;
  prompt: string;
  targetDurationSec?: number;
  selectedImageS3Key?: string;
  selectedImageDataUri?: string;
  secretId: string;
}): Promise<Record<string, unknown>> => {
  const secret = await getSecretJson<BytePlusVideoSecret>(input.secretId);
  const videoKey = `assets/${input.jobId}/videos/scene-${input.sceneId}.mp4`;
  const rawKey = `logs/${input.jobId}/provider/byteplus-video-scene-${input.sceneId}.json`;

  if (!secret?.apiKey) {
    const resolvedDurationSec = resolveRequestedBytePlusDurationSec({
      secret: secret ?? { apiKey: "" },
      targetDurationSec: input.targetDurationSec,
    });
    return putMockVideo({
      videoKey,
      rawKey,
      prompt: input.prompt,
      targetDurationSec: input.targetDurationSec,
      resolvedDurationSec,
    });
  }

  const endpoint = getRequiredEndpoint(secret);
  const queryEndpointTemplate = getRequiredQueryEndpoint(secret);
  const model = resolveVideoModel(secret);
  const promptField = resolvePromptField(secret);
  const imageField = secret.imageField?.trim();
  const requestMeta = buildBytePlusRequestMeta({
    secret,
    targetDurationSec: input.targetDurationSec,
    selectedImageDataUri: input.selectedImageDataUri,
  });

  try {
    return await completeBytePlusVideo({
      secret: { ...secret, apiKey: secret.apiKey },
      endpoint,
      queryEndpointTemplate,
      videoKey,
      rawKey,
      model,
      promptField,
      imageField,
      prompt: input.prompt,
      targetDurationSec: input.targetDurationSec,
      selectedImageS3Key: input.selectedImageS3Key,
      selectedImageDataUri: input.selectedImageDataUri,
    });
  } catch (error) {
    return failBytePlusVideo({
      rawKey,
      endpoint,
      queryEndpoint: queryEndpointTemplate,
      model,
      promptField,
      imageField,
      targetDurationSec: input.targetDurationSec,
      resolvedDurationSec: resolveRequestedBytePlusDurationSec({
        secret,
        targetDurationSec: input.targetDurationSec,
      }),
      selectedImageS3Key: input.selectedImageS3Key,
      selectedImageDataUri: input.selectedImageDataUri,
      requestMeta,
      prompt: input.prompt,
      error,
    });
  }
};
