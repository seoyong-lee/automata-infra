import { randomUUID } from "node:crypto";

import { putItem, queryItems } from "../aws/runtime";
import { contentPk } from "./video-jobs";

const publishQueueSkPrefix = "PUBLISH_QUEUE#";

export type ChannelPublishQueueItemStatus =
  | "QUEUED"
  | "SCHEDULED"
  | "PUBLISHED"
  | "REMOVED";

export type ChannelPublishQueueRow = {
  PK: string;
  SK: string;
  queueItemId: string;
  channelId: string;
  jobId: string;
  status: ChannelPublishQueueItemStatus;
  priority: number;
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string;
  publishedAt?: string;
  note?: string;
  enqueuedBy?: string;
};

export const listChannelPublishQueueRows = async (
  channelId: string,
): Promise<ChannelPublishQueueRow[]> => {
  const items = await queryItems<ChannelPublishQueueRow>({
    keyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    expressionAttributeValues: {
      ":pk": contentPk(channelId),
      ":sk": publishQueueSkPrefix,
    },
    scanIndexForward: false,
    limit: 200,
  });
  return items.filter((r) => r.status !== "REMOVED");
};

export const findQueuedPublishQueueRowForJob = async (
  channelId: string,
  jobId: string,
): Promise<ChannelPublishQueueRow | undefined> => {
  const rows = await listChannelPublishQueueRows(channelId);
  return rows.find((r) => r.jobId === jobId && r.status === "QUEUED");
};

export const enqueueChannelPublishQueueItem = async (input: {
  channelId: string;
  jobId: string;
  note?: string;
  enqueuedBy?: string;
}): Promise<ChannelPublishQueueRow> => {
  const existing = await findQueuedPublishQueueRowForJob(
    input.channelId,
    input.jobId,
  );
  if (existing) {
    return existing;
  }
  const queueItemId = randomUUID();
  const createdAt = new Date().toISOString();
  const SK = `${publishQueueSkPrefix}${createdAt}#${queueItemId}`;
  const row: ChannelPublishQueueRow = {
    PK: contentPk(input.channelId),
    SK,
    queueItemId,
    channelId: input.channelId,
    jobId: input.jobId,
    status: "QUEUED",
    priority: 0,
    createdAt,
    updatedAt: createdAt,
    ...(input.note ? { note: input.note } : {}),
    ...(input.enqueuedBy ? { enqueuedBy: input.enqueuedBy } : {}),
  };
  await putItem(row as unknown as Record<string, unknown>);
  return row;
};
