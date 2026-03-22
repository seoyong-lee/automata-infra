import { randomUUID } from "node:crypto";

import type { PublishTargetRow } from "../../../../lib/modules/publish/contracts/publish-domain";
import { putItem, queryItems } from "../aws/runtime";
import { buildDefaultPublishTargetsForJob } from "./platform-connections";
import { replacePublishTargetsForJob } from "./publish-targets-job";
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
  /** 멀티 플랫폼 발행: 플랫폼 연결당 1건. 레거시 행은 생략될 수 있음. */
  publishTargets?: PublishTargetRow[];
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

const findMutablePublishQueueRowForJob = async (
  channelId: string,
  jobId: string,
): Promise<ChannelPublishQueueRow | undefined> => {
  const rows = await listChannelPublishQueueRows(channelId);
  return rows.find(
    (r) => r.jobId === jobId && r.status !== "REMOVED" && r.status !== "PUBLISHED",
  );
};

const minScheduledAt = (targets: PublishTargetRow[]): string | undefined => {
  const values = targets
    .map((target) => target.scheduledAt)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  return values[0];
};

const resolveQueueStatus = (
  targets: PublishTargetRow[],
): Pick<ChannelPublishQueueRow, "status" | "scheduledAt" | "publishedAt"> => {
  if (targets.length === 0) {
    return { status: "QUEUED" };
  }

  const allFinished = targets.every(
    (target) => target.status === "PUBLISHED" || target.status === "SKIPPED",
  );
  if (allFinished) {
    return {
      status: "PUBLISHED",
      publishedAt: new Date().toISOString(),
    };
  }

  const hasImmediateWork = targets.some(
    (target) =>
      target.status === "QUEUED" ||
      target.status === "PUBLISHING" ||
      target.status === "FAILED",
  );
  const scheduledAt = minScheduledAt(
    targets.filter((target) => target.status === "SCHEDULED" && target.scheduledAt),
  );

  if (!hasImmediateWork && scheduledAt) {
    return {
      status: "SCHEDULED",
      scheduledAt,
    };
  }

  return { status: "QUEUED" };
};

export const enqueueChannelPublishQueueItem = async (input: {
  channelId: string;
  jobId: string;
  note?: string;
  enqueuedBy?: string;
}): Promise<ChannelPublishQueueRow> => {
  const existing = await findMutablePublishQueueRowForJob(
    input.channelId,
    input.jobId,
  );
  if (existing) {
    return existing;
  }
  const publishTargets = await buildDefaultPublishTargetsForJob({
    channelId: input.channelId,
    jobId: input.jobId,
  });
  await replacePublishTargetsForJob(input.jobId, publishTargets);
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
    ...(publishTargets.length > 0 ? { publishTargets } : {}),
    ...(input.note ? { note: input.note } : {}),
    ...(input.enqueuedBy ? { enqueuedBy: input.enqueuedBy } : {}),
  };
  await putItem(row as unknown as Record<string, unknown>);
  return row;
};

export const syncChannelPublishQueueRowForJob = async (input: {
  channelId: string;
  jobId: string;
  targets: PublishTargetRow[];
}): Promise<ChannelPublishQueueRow | undefined> => {
  const row = await findMutablePublishQueueRowForJob(input.channelId, input.jobId);
  if (!row) {
    return undefined;
  }

  const nextStatus = resolveQueueStatus(input.targets);
  const updatedAt = new Date().toISOString();
  const nextRow: ChannelPublishQueueRow = {
    ...row,
    status: nextStatus.status,
    updatedAt,
    ...(nextStatus.scheduledAt ? { scheduledAt: nextStatus.scheduledAt } : {}),
    ...(nextStatus.publishedAt
      ? { publishedAt: row.publishedAt ?? nextStatus.publishedAt }
      : {}),
  };

  if (!nextStatus.scheduledAt) {
    delete nextRow.scheduledAt;
  }
  if (!nextStatus.publishedAt && nextStatus.status !== "PUBLISHED") {
    delete nextRow.publishedAt;
  }

  await putItem(nextRow as unknown as Record<string, unknown>);
  return nextRow;
};
