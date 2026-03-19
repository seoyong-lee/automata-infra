import { Handler } from "aws-lambda";
import { parsePendingReviewsArgs } from "./normalize/parse-pending-reviews-args";
import { getPendingReviews } from "./usecase/get-pending-reviews";
import { GraphqlResolverEvent } from "../shared/types";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const parsed = parsePendingReviewsArgs(
    (event.arguments ?? {}) as Record<string, unknown>,
  );
  return getPendingReviews(parsed);
};
