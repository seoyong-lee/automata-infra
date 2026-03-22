import { createHash } from "crypto";
import { getSecretJson, putJsonToS3 } from "../../aws/runtime";
import { fetchJsonWithRetry, pollUntil } from "../http/retry";

type BytePlusVideoSecret = {
  apiKey: string;
  model?: string;
  endpoint?: string;
  queryEndpoint?: string;
  promptField?: string;
  extraBody?: Record<string, unknown>;
};

const DONE_STATUSES = new Set(["succeeded", "completed", "done", "success"]);
const FAILED_STATUSES = new Set(["failed", "error", "cancelled", "canceled"]);

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

const submitBytePlusVideoTask = async (input: {
  endpoint: string;
  apiKey: string;
  model: string;
  prompt: string;
  promptField: string;
  extraBody?: Record<string, unknown>;
}): Promise<Record<string, unknown>> => {
  return fetchJsonWithRetry<Record<string, unknown>>(input.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      [input.promptField]: input.prompt,
      ...(input.extraBody ?? {}),
    }),
  });
};

const pollBytePlusVideoTask = async (input: {
  endpoint: string;
  apiKey: string;
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
    intervalMs: 3000,
    timeoutMs: 120000,
  });
};

export const generateSceneBytePlusVideo = async (input: {
  jobId: string;
  sceneId: number;
  prompt: string;
  secretId: string;
}): Promise<Record<string, unknown>> => {
  const secret = await getSecretJson<BytePlusVideoSecret>(input.secretId);
  const videoKey = `assets/${input.jobId}/videos/scene-${input.sceneId}.json`;
  const rawKey = `logs/${input.jobId}/provider/byteplus-video-scene-${input.sceneId}.json`;

  if (!secret?.apiKey) {
    const mocked = {
      mocked: true,
      prompt: input.prompt,
      clipManifest: true,
      provider: "byteplus-video",
    };
    await putJsonToS3(videoKey, mocked);
    await putJsonToS3(rawKey, mocked);

    return {
      provider: "mock",
      videoClipS3Key: videoKey,
      providerLogS3Key: rawKey,
      promptHash: hashPrompt(input.prompt),
      mocked: true,
    };
  }

  const endpoint =
    secret.endpoint ??
    "https://ark.ap-southeast.bytepluses.com/api/v3/video/generations";
  const submitted = await submitBytePlusVideoTask({
    endpoint,
    apiKey: secret.apiKey,
    model: secret.model ?? "seedance-1-0-lite-250528",
    prompt: input.prompt,
    promptField: secret.promptField?.trim() || "prompt",
    extraBody: secret.extraBody,
  });
  const taskId = getTaskId(submitted);
  let payload: Record<string, unknown> = submitted;
  const initialStatus = getStatus(submitted);

  if (taskId && !DONE_STATUSES.has(initialStatus)) {
    payload = await pollBytePlusVideoTask({
      endpoint: resolveQueryEndpoint(endpoint, secret.queryEndpoint, taskId),
      apiKey: secret.apiKey,
    });
  }

  await putJsonToS3(rawKey, {
    submit: submitted,
    final: payload,
    endpoint,
    queryEndpoint: taskId
      ? resolveQueryEndpoint(endpoint, secret.queryEndpoint, taskId)
      : undefined,
  });
  await putJsonToS3(videoKey, payload);

  return {
    provider: "byteplus-video",
    videoClipS3Key: videoKey,
    providerLogS3Key: rawKey,
    promptHash: hashPrompt(input.prompt),
    mocked: false,
  };
};
