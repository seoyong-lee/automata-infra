import { Handler } from "aws-lambda";
import { getActor } from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../shared/audit-log";
import { toGraphqlResolverError } from "../shared/errors";
import { parsePendingReviewsArgs } from "./normalize/parse-pending-reviews-args";
import { getPendingReviews } from "./usecase/get-pending-reviews";
import { GraphqlResolverEvent } from "../shared/types";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const actor = getActor(event.identity);
  try {
    logResolverAudit({
      operation: "pendingReviews",
      operationType: "query",
      phase: "started",
      actor,
    });
    const parsed = parsePendingReviewsArgs(
      (event.arguments ?? {}) as Record<string, unknown>,
    );
    const result = await getPendingReviews(parsed);
    logResolverAudit({
      operation: "pendingReviews",
      operationType: "query",
      phase: "succeeded",
      actor,
    });
    return result;
  } catch (error) {
    const mapped = toGraphqlResolverError(error);
    logResolverAudit({
      operation: "pendingReviews",
      operationType: "query",
      phase: "failed",
      actor,
      errorCode: mapped.code,
      errorMessage: mapped.message,
    });
    throw mapped;
  }
};
