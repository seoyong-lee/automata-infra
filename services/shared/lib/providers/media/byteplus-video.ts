import { createHash } from "crypto";
import { getSecretJson, putJsonToS3 } from "../../aws/runtime";
import { fetchJsonWithRetry, pollUntil } from "../http/retry";

type BytePlusVideoSecret = {
  apiKey: string;
  model?: string;
  endpoint?: string;
  queryEndpoint?: string;
  promptField?: string;
  imageField?: string;
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

const getRequiredEndpoint = (secret: BytePlusVideoSecret): string => {
  const endpoint = secret.endpoint?.trim();
  if (!endpoint) {
    throw new Error(
      "BytePlus video secret is missing `endpoint`. Set the exact create-task API URL from ModelArk.",
    );
  }
  return endpoint;
};

const getRequiredQueryEndpoint = (secret: BytePlusVideoSecret): string => {
  const queryEndpoint = secret.queryEndpoint?.trim();
  if (!queryEndpoint) {
    throw new Error(
      "BytePlus video secret is missing `queryEndpoint`. Set the exact task-status API URL from ModelArk and include `{id}` if needed.",
    );
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

const submitBytePlusVideoTask = async (input: {
  endpoint: string;
  apiKey: string;
  model: string;
  prompt: string;
  promptField: string;
  imageField?: string;
  selectedImageDataUri?: string;
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
      ...(input.imageField && input.selectedImageDataUri
        ? { [input.imageField]: input.selectedImageDataUri }
        : {}),
      ...(input.extraBody ?? {}),
    }),
  });
};

const putMockVideo = async (input: {
  videoKey: string;
  rawKey: string;
  prompt: string;
}): Promise<Record<string, unknown>> => {
  const mocked = {
    mocked: true,
    prompt: input.prompt,
    clipManifest: true,
    provider: "byteplus-video",
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

const executeBytePlusVideoTask = async (input: {
  secret: BytePlusVideoSecret & { apiKey: string };
  endpoint: string;
  queryEndpointTemplate: string;
  prompt: string;
  selectedImageDataUri?: string;
}): Promise<{
  submitted: Record<string, unknown>;
  payload: Record<string, unknown>;
  resolvedQueryEndpoint?: string;
}> => {
  const submitted = await submitBytePlusVideoTask({
    endpoint: input.endpoint,
    apiKey: input.secret.apiKey,
    model: resolveVideoModel(input.secret),
    prompt: input.prompt,
    promptField: resolvePromptField(input.secret),
    imageField: input.secret.imageField?.trim(),
    selectedImageDataUri: input.selectedImageDataUri,
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
    });
  }

  return {
    submitted,
    payload,
    resolvedQueryEndpoint,
  };
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
  selectedImageS3Key?: string;
  selectedImageDataUri?: string;
  secretId: string;
}): Promise<Record<string, unknown>> => {
  const secret = await getSecretJson<BytePlusVideoSecret>(input.secretId);
  const videoKey = `assets/${input.jobId}/videos/scene-${input.sceneId}.json`;
  const rawKey = `logs/${input.jobId}/provider/byteplus-video-scene-${input.sceneId}.json`;

  if (!secret?.apiKey) {
    return putMockVideo({
      videoKey,
      rawKey,
      prompt: input.prompt,
    });
  }

  const endpoint = getRequiredEndpoint(secret);
  const queryEndpointTemplate = getRequiredQueryEndpoint(secret);
  const model = resolveVideoModel(secret);
  const promptField = resolvePromptField(secret);
  const imageField = secret.imageField?.trim();

  try {
    const { submitted, payload, resolvedQueryEndpoint } =
      await executeBytePlusVideoTask({
        secret: { ...secret, apiKey: secret.apiKey },
        endpoint,
        queryEndpointTemplate,
        prompt: input.prompt,
        selectedImageDataUri: input.selectedImageDataUri,
      });
    await putJsonToS3(rawKey, {
      submit: submitted,
      final: payload,
      endpoint,
      queryEndpoint: resolvedQueryEndpoint,
      model,
      promptField,
      imageField,
      selectedImageS3Key: input.selectedImageS3Key,
      selectedImageAttached: Boolean(input.selectedImageDataUri),
    });
    await putJsonToS3(videoKey, payload);

    return {
      provider: "byteplus-video",
      videoClipS3Key: videoKey,
      providerLogS3Key: rawKey,
      promptHash: hashPrompt(input.prompt),
      mocked: false,
    };
  } catch (error) {
    await putJsonToS3(rawKey, {
      status: "ERROR",
      endpoint,
      queryEndpoint: queryEndpointTemplate,
      model,
      promptField,
      imageField,
      selectedImageS3Key: input.selectedImageS3Key,
      selectedImageAttached: Boolean(input.selectedImageDataUri),
      promptPreview: input.prompt.slice(0, 300),
      error: error instanceof Error ? error.message : String(error),
    });
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `BytePlus video generation failed: model=${model}, endpoint=${endpoint}, queryEndpoint=${queryEndpointTemplate}, promptField=${promptField}, imageField=${imageField ?? "none"}, selectedImage=${input.selectedImageS3Key ?? "none"}, logKey=${rawKey}, error=${message}`,
    );
  }
};
