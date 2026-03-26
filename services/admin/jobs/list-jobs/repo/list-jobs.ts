import { ADMIN_UNASSIGNED_CONTENT_ID } from "../../../../shared/lib/contracts/canonical-io-schemas";
import {
  listJobMetasByContentId,
  listJobMetasByGsi2Partition,
  listJobMetasByStatus,
  listJobMetasMergedByRecent,
} from "../../../../shared/lib/store/video-jobs";

export const listJobs = async (input: {
  status?: string;
  contentId?: string;
  nextToken?: string;
  limit: number;
}) => {
  if (input.contentId) {
    if (
      input.contentId.startsWith("cnt_") ||
      input.contentId === ADMIN_UNASSIGNED_CONTENT_ID
    ) {
      return listJobMetasByContentId({
        contentId: input.contentId,
        limit: input.limit,
        nextToken: input.nextToken,
      });
    }
    return listJobMetasByGsi2Partition({
      partitionId: input.contentId,
      limit: input.limit,
      nextToken: input.nextToken,
    });
  }
  if (input.status) {
    return listJobMetasByStatus({
      status: input.status,
      limit: input.limit,
      nextToken: input.nextToken,
    });
  }
  return listJobMetasMergedByRecent({
    limit: input.limit,
    nextToken: input.nextToken,
  });
};
