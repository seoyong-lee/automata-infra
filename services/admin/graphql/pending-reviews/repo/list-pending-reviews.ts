import { listJobMetasByStatus } from "../../../../shared/lib/store/video-jobs";

export const listPendingReviews = async (limit: number) => {
  return listJobMetasByStatus({
    status: "REVIEW_PENDING",
    limit,
  });
};
