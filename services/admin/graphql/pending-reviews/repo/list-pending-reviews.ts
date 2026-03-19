import { listJobMetasByStatus } from "../../../../shared/lib/store/video-jobs";

export const listPendingReviews = async (input: {
  limit: number;
  nextToken?: string;
}) => {
  return listJobMetasByStatus({
    status: "REVIEW_PENDING",
    limit: input.limit,
    nextToken: input.nextToken,
  });
};
