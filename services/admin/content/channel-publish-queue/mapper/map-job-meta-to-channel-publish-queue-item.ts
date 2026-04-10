import type { JobMetaItem } from "../../../../shared/lib/store/video-jobs-shared";
import type { ChannelPublishQueueItemStatus } from "../../../shared/types";

const QUEUE_JOB_STATUSES = new Set(["READY_TO_SCHEDULE", "UPLOAD_QUEUED"]);

const resolveQueueStatus = (
  job: JobMetaItem,
): ChannelPublishQueueItemStatus | undefined => {
  if (!QUEUE_JOB_STATUSES.has(job.status)) {
    return undefined;
  }
  if (
    job.status === "UPLOAD_QUEUED" &&
    typeof job.publishAt === "string" &&
    job.publishAt.trim().length > 0
  ) {
    return "SCHEDULED";
  }
  return "QUEUED";
};

export const mapJobMetaToChannelPublishQueueItem = (
  job: JobMetaItem,
): {
  queueItemId: string;
  channelId: string;
  jobId: string;
  channelContentItemId: string;
  status: ChannelPublishQueueItemStatus;
  priority: number;
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string;
  publishedAt?: string;
  note?: string;
  enqueuedBy?: string;
  publishTargets: [];
} | null => {
  const contentId = job.contentId?.trim();
  if (!contentId) {
    return null;
  }

  const status = resolveQueueStatus(job);
  if (!status) {
    return null;
  }

  return {
    queueItemId: job.jobId,
    channelId: contentId,
    jobId: job.jobId,
    channelContentItemId: job.jobId,
    status,
    priority: 0,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    scheduledAt:
      typeof job.publishAt === "string" && job.publishAt.trim().length > 0
        ? job.publishAt.trim()
        : undefined,
    publishTargets: [],
  };
};
