import { ADMIN_UNASSIGNED_CONTENT_ID } from "../../../../shared/lib/contracts/canonical-io-schemas";
import { listChannelPublishQueueRows } from "../../../../shared/lib/store/channel-publish-queue";
import { badUserInput } from "../../shared/errors";
import { mapChannelPublishQueueRowToGraphql } from "../../shared/mapper/map-channel-publish-queue-item";

export const listChannelPublishQueueUsecase = async (contentId: string) => {
  if (contentId === ADMIN_UNASSIGNED_CONTENT_ID) {
    throw badUserInput("invalid contentId");
  }
  const rows = await listChannelPublishQueueRows(contentId);
  return rows.map(mapChannelPublishQueueRowToGraphql);
};
