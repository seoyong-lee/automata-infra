import { publishTargetSchema } from "../../../../../lib/modules/publish/contracts/publish-domain";
import type { ChannelPublishQueueRow } from "../../../../shared/lib/store/channel-publish-queue";
import type { ChannelPublishQueueItemDto, PublishTargetDto } from "../types";

const mapPublishTargetRow = (raw: unknown): PublishTargetDto | null => {
  const parsed = publishTargetSchema.safeParse(raw);
  if (!parsed.success) {
    return null;
  }
  const t = parsed.data;
  return {
    publishTargetId: t.publishTargetId,
    channelContentItemId: t.channelContentItemId,
    platformConnectionId: t.platformConnectionId,
    platform: t.platform,
    status: t.status,
    scheduledAt: t.scheduledAt,
    externalPostId: t.externalPostId,
    externalUrl: t.externalUrl,
    publishError: t.publishError,
  };
};

export const mapChannelPublishQueueRowToGraphql = (
  row: ChannelPublishQueueRow,
): ChannelPublishQueueItemDto => {
  const jobId = row.jobId ?? "";
  const rawTargets = row.publishTargets;
  const publishTargets: PublishTargetDto[] = Array.isArray(rawTargets)
    ? rawTargets
        .map(mapPublishTargetRow)
        .filter((x): x is PublishTargetDto => x !== null)
    : [];
  return {
    queueItemId: row.queueItemId ?? "",
    channelId: row.channelId ?? "",
    jobId,
    channelContentItemId: jobId,
    status: row.status ?? "QUEUED",
    priority: typeof row.priority === "number" ? row.priority : 0,
    createdAt: row.createdAt ?? "",
    updatedAt: row.updatedAt ?? "",
    scheduledAt: row.scheduledAt,
    publishedAt: row.publishedAt,
    note: row.note,
    enqueuedBy: row.enqueuedBy,
    publishTargets,
  };
};
