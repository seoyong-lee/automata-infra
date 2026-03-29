export type BytePlusVideoSecret = {
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

const DEFAULT_CREATE_ENDPOINT =
  "https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks";
const DEFAULT_QUERY_ENDPOINT =
  "https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks/{id}";
const DEFAULT_POLL_INTERVAL_MS = 3000;
const DEFAULT_POLL_TIMEOUT_MS = 600000;
const DEFAULT_SUPPORTED_DURATIONS_SEC = [5, 8, 10] as const;

export const getRequiredEndpoint = (secret: BytePlusVideoSecret): string => {
  const endpoint = secret.endpoint?.trim();
  if (!endpoint) {
    return DEFAULT_CREATE_ENDPOINT;
  }
  if (endpoint.includes("/video/generations")) {
    return DEFAULT_CREATE_ENDPOINT;
  }
  return endpoint;
};

export const getRequiredQueryEndpoint = (
  secret: BytePlusVideoSecret,
): string => {
  const queryEndpoint = secret.queryEndpoint?.trim();
  if (!queryEndpoint) {
    return DEFAULT_QUERY_ENDPOINT;
  }
  if (queryEndpoint.includes("/video/generations")) {
    return DEFAULT_QUERY_ENDPOINT;
  }
  return queryEndpoint;
};

export const resolveVideoModel = (secret: BytePlusVideoSecret): string => {
  return secret.model ?? "seedance-1-0-lite-250528";
};

export const resolvePromptField = (secret: BytePlusVideoSecret): string => {
  return secret.promptField?.trim() || "prompt";
};

const resolveRatio = (
  secret: BytePlusVideoSecret,
  hasImage: boolean,
): string => {
  return secret.ratio?.trim() || (hasImage ? "adaptive" : "9:16");
};

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

export const buildBytePlusRequestMeta = (input: {
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
