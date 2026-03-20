import { getSecretJson, putJsonToS3 } from "../../aws/runtime";
import { fetchJsonWithRetry, pollUntil } from "../http/retry";
import { mapRenderPlanToShotstackEdit } from "./shotstack-mapper";

type ShotstackSecret = {
  apiKey: string;
  endpoint?: string;
};

const DONE_STATUSES = new Set(["done", "finished", "completed", "success"]);
const FAILED_STATUSES = new Set(["failed", "error", "cancelled", "canceled"]);

const resolveShotstackStatus = (payload: Record<string, unknown>): string => {
  const response = (payload as { response?: { status?: string } }).response;
  const nested = response?.status;
  if (typeof nested === "string") {
    return nested.toLowerCase();
  }
  return typeof payload.status === "string" ? payload.status.toLowerCase() : "";
};

const getShotstackResponse = (
  payload: Record<string, unknown>,
): Record<string, unknown> => {
  const response = (payload as { response?: Record<string, unknown> }).response;
  return response ?? payload;
};

const buildShotstackHeaders = (apiKey: string) => {
  return {
    "x-api-key": apiKey,
    "Content-Type": "application/json",
  };
};

const submitShotstackRender = async (input: {
  endpoint: string;
  apiKey: string;
  renderPlan: Record<string, unknown>;
}): Promise<Record<string, unknown>> => {
  return fetchJsonWithRetry<Record<string, unknown>>(input.endpoint, {
    method: "POST",
    headers: buildShotstackHeaders(input.apiKey),
    body: JSON.stringify(input.renderPlan),
  });
};

const pollShotstackRender = async (input: {
  endpoint: string;
  apiKey: string;
  renderId: string;
}): Promise<Record<string, unknown>> => {
  return pollUntil<Record<string, unknown>>({
    fetcher: () =>
      fetchJsonWithRetry<Record<string, unknown>>(
        `${input.endpoint}/${input.renderId}`,
        {
          method: "GET",
          headers: buildShotstackHeaders(input.apiKey),
        },
      ),
    isDone: (current) => DONE_STATUSES.has(resolveShotstackStatus(current)),
    isFailed: (current) => FAILED_STATUSES.has(resolveShotstackStatus(current)),
    getStatus: (current) => {
      const nested = (current as { response?: { status?: string } }).response
        ?.status;
      return typeof nested === "string"
        ? nested
        : typeof current.status === "string"
          ? current.status
          : "unknown";
    },
    intervalMs: 3000,
    timeoutMs: 120000,
  });
};

export const composeWithShotstack = async (input: {
  jobId: string;
  renderPlan: Record<string, unknown>;
  secretId: string;
}): Promise<Record<string, unknown>> => {
  const secret = await getSecretJson<ShotstackSecret>(input.secretId);
  const rawKey = `logs/${input.jobId}/composition/shotstack-request.json`;
  const shotstackEdit = mapRenderPlanToShotstackEdit(input.renderPlan);

  if (!secret?.apiKey) {
    await putJsonToS3(rawKey, {
      mocked: true,
      renderPlan: input.renderPlan,
      shotstackEdit,
    });
    return {
      provider: "mock",
      mocked: true,
      responseLogS3Key: rawKey,
      finalVideoS3Key: `rendered/${input.jobId}/final.mp4`,
      thumbnailS3Key: `rendered/${input.jobId}/thumbnail.jpg`,
      previewS3Key: `previews/${input.jobId}/preview.mp4`,
    };
  }

  const endpoint = secret.endpoint ?? "https://api.shotstack.io/stage/render";
  const submitted = await submitShotstackRender({
    endpoint,
    apiKey: secret.apiKey,
    renderPlan: shotstackEdit,
  });
  const renderId =
    (submitted as { response?: { id?: string } }).response?.id ?? null;

  let payload: Record<string, unknown> = submitted;
  if (renderId) {
    payload = await pollShotstackRender({
      endpoint,
      apiKey: secret.apiKey,
      renderId,
    });
  }
  await putJsonToS3(rawKey, {
    edit: shotstackEdit,
    submit: submitted,
    final: payload,
  });

  const resolvedPayload = getShotstackResponse(payload);
  const videoUrl =
    typeof resolvedPayload.url === "string" ? resolvedPayload.url : undefined;
  const thumbnailUrl =
    typeof resolvedPayload.thumbnail === "string"
      ? resolvedPayload.thumbnail
      : typeof resolvedPayload.poster === "string"
        ? resolvedPayload.poster
        : undefined;

  return {
    provider: "shotstack",
    mocked: false,
    responseLogS3Key: rawKey,
    providerRenderId: renderId,
    finalVideoS3Key: `rendered/${input.jobId}/final.mp4`,
    thumbnailS3Key: `rendered/${input.jobId}/thumbnail.jpg`,
    previewS3Key: `previews/${input.jobId}/preview.mp4`,
    sourceVideoUrl: videoUrl,
    sourceThumbnailUrl: thumbnailUrl,
  };
};
