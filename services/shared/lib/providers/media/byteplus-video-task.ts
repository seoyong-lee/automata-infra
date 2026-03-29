import { fetchJsonWithRetry, pollUntil } from "../http/retry";
import {
  buildBytePlusRequestMeta,
  type BytePlusVideoSecret,
  resolveVideoModel,
} from "./byteplus-video-config";
import {
  getBytePlusTaskId,
  getBytePlusTaskStatusLabel,
  isBytePlusTaskDone,
  isBytePlusTaskFailed,
  resolveBytePlusQueryEndpoint,
} from "./byteplus-video-response";

const submitBytePlusVideoTask = async (input: {
  endpoint: string;
  apiKey: string;
  model: string;
  prompt: string;
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
    isDone: isBytePlusTaskDone,
    isFailed: isBytePlusTaskFailed,
    getStatus: getBytePlusTaskStatusLabel,
    intervalMs: input.intervalMs,
    timeoutMs: input.timeoutMs,
  });
};

const buildSubmitBytePlusVideoTaskInput = (input: {
  endpoint: string;
  secret: BytePlusVideoSecret & { apiKey: string };
  prompt: string;
  selectedImageDataUri?: string;
  requestMeta: Record<string, unknown>;
}) => {
  return {
    endpoint: input.endpoint,
    apiKey: input.secret.apiKey,
    model: resolveVideoModel(input.secret),
    prompt: input.prompt,
    selectedImageDataUri: input.selectedImageDataUri,
    ratio:
      typeof input.requestMeta.ratio === "string"
        ? input.requestMeta.ratio
        : "9:16",
    duration:
      typeof input.requestMeta.duration === "number"
        ? input.requestMeta.duration
        : 5,
    resolution:
      typeof input.requestMeta.resolution === "string"
        ? input.requestMeta.resolution
        : "720p",
    generateAudio:
      typeof input.requestMeta.generateAudio === "boolean"
        ? input.requestMeta.generateAudio
        : undefined,
    watermark:
      typeof input.requestMeta.watermark === "boolean"
        ? input.requestMeta.watermark
        : undefined,
    extraBody: input.secret.extraBody,
  };
};

const resolveBytePlusVideoPayload = async (input: {
  submitted: Record<string, unknown>;
  resolvedQueryEndpoint?: string;
  apiKey: string;
  requestMeta: Record<string, unknown>;
}): Promise<Record<string, unknown>> => {
  if (!input.resolvedQueryEndpoint || isBytePlusTaskDone(input.submitted)) {
    return input.submitted;
  }

  return pollBytePlusVideoTask({
    endpoint: input.resolvedQueryEndpoint,
    apiKey: input.apiKey,
    intervalMs:
      typeof input.requestMeta.pollIntervalMs === "number"
        ? input.requestMeta.pollIntervalMs
        : 3000,
    timeoutMs:
      typeof input.requestMeta.pollTimeoutMs === "number"
        ? input.requestMeta.pollTimeoutMs
        : 600000,
  });
};

export const executeBytePlusVideoTask = async (input: {
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
  const submitted = await submitBytePlusVideoTask(
    buildSubmitBytePlusVideoTaskInput({
      endpoint: input.endpoint,
      secret: input.secret,
      prompt: input.prompt,
      selectedImageDataUri: input.selectedImageDataUri,
      requestMeta,
    }),
  );
  const taskId = getBytePlusTaskId(submitted);
  const resolvedQueryEndpoint = taskId
    ? resolveBytePlusQueryEndpoint(
        input.endpoint,
        input.queryEndpointTemplate,
        taskId,
      )
    : undefined;
  const payload = await resolveBytePlusVideoPayload({
    submitted,
    resolvedQueryEndpoint,
    apiKey: input.secret.apiKey,
    requestMeta,
  });

  return {
    submitted,
    payload,
    resolvedQueryEndpoint,
    requestMeta,
  };
};
