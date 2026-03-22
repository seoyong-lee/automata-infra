import {
  listPublishTargetsByJob,
  updatePublishTargetJobItem,
} from "../../../../shared/lib/store/publish-targets-job";
import { syncChannelPublishQueueRowForJob } from "../../../../shared/lib/store/channel-publish-queue";
import { getJobMeta } from "../../../../shared/lib/store/video-jobs";
import { badUserInput } from "../../shared/errors";

const normalizeScheduledAt = (raw?: string | null): string | undefined => {
  if (!raw?.trim()) {
    return undefined;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw badUserInput("scheduledAt must be a valid date");
  }
  return parsed.toISOString();
};

export const updatePublishTargetScheduleUsecase = async (input: {
  jobId: string;
  publishTargetId: string;
  scheduledAt?: string | null;
}) => {
  const job = await getJobMeta(input.jobId);
  if (!job) {
    throw badUserInput("job not found");
  }
  if (!job.contentId) {
    throw badUserInput("job must have contentId");
  }

  const targets = await listPublishTargetsByJob(input.jobId);
  const current = targets.find((target) => target.publishTargetId === input.publishTargetId);
  if (!current) {
    throw badUserInput("publish target not found");
  }
  if (current.status === "PUBLISHED" || current.status === "PUBLISHING") {
    throw badUserInput("cannot reschedule a target already being processed");
  }

  const scheduledAt = normalizeScheduledAt(input.scheduledAt);
  await updatePublishTargetJobItem(input.jobId, input.publishTargetId, {
    status: scheduledAt ? "SCHEDULED" : "QUEUED",
    scheduledAt,
    publishError: undefined,
  });

  const refreshed = await listPublishTargetsByJob(input.jobId);
  await syncChannelPublishQueueRowForJob({
    channelId: job.contentId,
    jobId: input.jobId,
    targets: refreshed,
  });

  const updated = refreshed.find((target) => target.publishTargetId === input.publishTargetId);
  if (!updated) {
    throw badUserInput("publish target not found after update");
  }
  return updated;
};
