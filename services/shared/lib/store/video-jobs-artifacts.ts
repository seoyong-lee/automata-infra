import type { RenderArtifactItem } from "./video-jobs-shared";
import {
  listAllJobScopedItems,
  listJobScopedItems,
  putJobScopedItem,
  sortByCreatedAtDesc,
} from "./video-jobs-helpers";

export const putRenderArtifact = async (
  jobId: string,
  item: Record<string, unknown>,
): Promise<void> => {
  await putJobScopedItem(jobId, "ARTIFACT#FINAL", item);
};

export const putFinalRenderArtifact = async (
  jobId: string,
  item: Omit<RenderArtifactItem, "PK" | "SK">,
): Promise<void> => {
  await putJobScopedItem(jobId, `ARTIFACT#FINAL#${item.createdAt}`, item);
};

export const listFinalRenderArtifacts = async (
  jobId: string,
): Promise<RenderArtifactItem[]> => {
  const items = await listJobScopedItems<RenderArtifactItem>({
    jobId,
    skPrefix: "ARTIFACT#FINAL#",
    scanIndexForward: false,
    limit: 50,
  });
  return sortByCreatedAtDesc(items);
};

export const putUploadRecord = async (
  jobId: string,
  item: Record<string, unknown>,
): Promise<void> => {
  await putJobScopedItem(jobId, "UPLOAD#YOUTUBE", item);
};

export const putReviewRecord = async (
  jobId: string,
  item: Record<string, unknown>,
): Promise<void> => {
  await putJobScopedItem(jobId, `REVIEW#${new Date().toISOString()}`, item);
};

export const listJobItems = async (
  jobId: string,
): Promise<Record<string, unknown>[]> => {
  return listJobScopedItems<Record<string, unknown>>({
    jobId,
    scanIndexForward: true,
    limit: 100,
  });
};

export const listAllJobItems = async (
  jobId: string,
): Promise<Record<string, unknown>[]> => {
  return listAllJobScopedItems(jobId);
};
