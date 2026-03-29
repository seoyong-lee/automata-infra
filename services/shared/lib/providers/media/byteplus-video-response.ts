import { createHash } from "crypto";

const DONE_STATUSES = new Set(["succeeded", "completed", "done", "success"]);
const FAILED_STATUSES = new Set(["failed", "error", "cancelled", "canceled"]);

export const hashPrompt = (prompt: string): string => {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 12);
};

export const getBytePlusTaskStatus = (
  payload: Record<string, unknown>,
): string => {
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

export const isBytePlusTaskDone = (
  payload: Record<string, unknown>,
): boolean => {
  return DONE_STATUSES.has(getBytePlusTaskStatus(payload));
};

export const isBytePlusTaskFailed = (
  payload: Record<string, unknown>,
): boolean => {
  return FAILED_STATUSES.has(getBytePlusTaskStatus(payload));
};

export const getBytePlusTaskStatusLabel = (
  payload: Record<string, unknown>,
): string => {
  if (typeof payload.status === "string") {
    return payload.status;
  }
  if (typeof payload.state === "string") {
    return payload.state;
  }
  if (typeof payload.task_status === "string") {
    return payload.task_status;
  }
  return "unknown";
};

export const getBytePlusTaskId = (
  payload: Record<string, unknown>,
): string | null => {
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

export const resolveBytePlusQueryEndpoint = (
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

export const pickBytePlusVideoUrl = (
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
