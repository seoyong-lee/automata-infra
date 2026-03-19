import { mapPendingReview } from "../mapper/map-pending-review";
import { listPendingReviews } from "../repo/list-pending-reviews";

export const getPendingReviews = async (limit: number) => {
  const items = await listPendingReviews(limit);
  return items.map(mapPendingReview);
};
