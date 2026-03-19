import { mapPendingReview } from "../mapper/map-pending-review";
import { listPendingReviews } from "../repo/list-pending-reviews";
import { ConnectionDto } from "../../shared/types";

export const getPendingReviews = async (input: {
  limit: number;
  nextToken?: string;
}): Promise<ConnectionDto<ReturnType<typeof mapPendingReview>>> => {
  const page = await listPendingReviews(input);
  return {
    items: page.items.map(mapPendingReview),
    nextToken: page.nextToken,
  };
};
