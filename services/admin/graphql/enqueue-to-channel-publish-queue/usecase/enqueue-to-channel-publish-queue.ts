import { ADMIN_UNASSIGNED_CONTENT_ID } from "../../../../shared/lib/contracts/canonical-io-schemas";
import { enqueueChannelPublishQueueItem } from "../../../../shared/lib/store/channel-publish-queue";
import { updateJobMeta } from "../../../../shared/lib/store/video-jobs";
import { badUserInput } from "../../shared/errors";
import { getJobOrThrow } from "../../shared/repo/job-draft-store";
import { mapChannelPublishQueueRowToGraphql } from "../../shared/mapper/map-channel-publish-queue-item";

export const enqueueToChannelPublishQueueUsecase = async (input: {
  contentId: string;
  jobId: string;
  note?: string;
  enqueuedBy?: string;
}) => {
  if (input.contentId === ADMIN_UNASSIGNED_CONTENT_ID) {
    throw badUserInput("contentId must be a real channel");
  }
  const job = await getJobOrThrow(input.jobId);
  const cid = job.contentId;
  if (!cid || cid === ADMIN_UNASSIGNED_CONTENT_ID) {
    throw badUserInput("job must be attached to a channel before enqueueing");
  }
  if (cid !== input.contentId) {
    throw badUserInput("job contentId does not match channel");
  }
  const row = await enqueueChannelPublishQueueItem({
    channelId: input.contentId,
    jobId: input.jobId,
    note: input.note,
    enqueuedBy: input.enqueuedBy,
  });
  await updateJobMeta(input.jobId, {}, "READY_TO_SCHEDULE");
  return mapChannelPublishQueueRowToGraphql(row);
};
