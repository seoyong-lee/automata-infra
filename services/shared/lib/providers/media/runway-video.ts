import { createHash } from "crypto";
import { getSecretJson, putJsonToS3 } from "../../aws/runtime";
import { fetchJsonWithRetry, pollUntil } from "../http/retry";

type RunwayVideoSecret = {
  apiKey: string;
  endpoint?: string;
  model?: string;
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
}): Promise<Record<string, unknown>> => {
  return fetchJsonWithRetry<Record<string, unknown>>(input.endpoint, {
    method: "POST",
    headers: input.headers,
    body: JSON.stringify({
      model: input.model,
      promptText: input.prompt,
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

export const generateSceneVideo = async (input: {
  jobId: string;
  sceneId: number;
  prompt: string;
  secretId: string;
}): Promise<Record<string, unknown>> => {
  const secret = await getSecretJson<RunwayVideoSecret>(input.secretId);
  const videoKey = `assets/${input.jobId}/videos/scene-${input.sceneId}.json`;
  const rawKey = `logs/${input.jobId}/provider/video-scene-${input.sceneId}.json`;

  if (!secret?.apiKey) {
    const mocked = {
      mocked: true,
      prompt: input.prompt,
      clipManifest: true,
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
    secret.endpoint ?? "https://api.dev.runwayml.com/v1/video_generations";
  const headers = {
    Authorization: `Bearer ${secret.apiKey}`,
    "Content-Type": "application/json",
    "X-Runway-Version": "2024-11-06",
  };
  const submitted = await submitRunwayGeneration({
    endpoint,
    headers,
    model: secret.model ?? "gen4_turbo",
    prompt: input.prompt,
  });
  const generationId = getGenerationId(submitted);
  let payload: Record<string, unknown> = submitted;
  const initialStatus = getStatus(submitted);

  if (generationId && !DONE_STATUSES.has(initialStatus)) {
    payload = await pollRunwayGeneration({
      endpoint,
      generationId,
      headers,
    });
  }

  await putJsonToS3(rawKey, {
    submit: submitted,
    final: payload,
  });
  await putJsonToS3(videoKey, payload);

  return {
    provider: "runway-video",
    videoClipS3Key: videoKey,
    providerLogS3Key: rawKey,
    promptHash: hashPrompt(input.prompt),
    mocked: false,
  };
};
