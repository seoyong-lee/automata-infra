import type { ChannelPublishQueueRow } from "../../../../shared/lib/store/channel-publish-queue";
import type { ChannelPublishQueueItemDto } from "../types";

export const mapChannelPublishQueueRowToGraphql = (
  row: ChannelPublishQueueRow,
): ChannelPublishQueueItemDto => {
  return {
    queueItemId: row.queueItemId,
    channelId: row.channelId,
    jobId: row.jobId,
    status: row.status,
    priority: row.priority,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    scheduledAt: row.scheduledAt,
    publishedAt: row.publishedAt,
    note: row.note,
    enqueuedBy: row.enqueuedBy,
  };
};
