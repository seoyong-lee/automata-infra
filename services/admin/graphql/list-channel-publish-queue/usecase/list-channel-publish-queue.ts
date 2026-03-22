import { ADMIN_UNASSIGNED_CONTENT_ID } from "../../../../shared/lib/contracts/canonical-io-schemas";
import { listChannelPublishQueueRows } from "../../../../shared/lib/store/channel-publish-queue";
import { listPublishTargetsByJob } from "../../../../shared/lib/store/publish-targets-job";
import { badUserInput } from "../../shared/errors";
import { mapChannelPublishQueueRowToGraphql } from "../../shared/mapper/map-channel-publish-queue-item";

export const listChannelPublishQueueUsecase = async (contentId: string) => {
  if (contentId === ADMIN_UNASSIGNED_CONTENT_ID) {
    throw badUserInput("invalid contentId");
  }
  const rows = await listChannelPublishQueueRows(contentId);
  return Promise.all(
    rows.map(async (row) => {
      const jobTargets = await listPublishTargetsByJob(row.jobId);
      const override = jobTargets.length > 0 ? jobTargets : undefined;
      return mapChannelPublishQueueRowToGraphql(row, override);
    }),
  );
};
