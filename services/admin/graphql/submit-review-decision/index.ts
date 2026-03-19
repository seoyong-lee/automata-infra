import { Handler } from "aws-lambda";
import { assertAdminGroup } from "../../../shared/lib/auth/admin-claims";
import { parseSubmitReviewDecisionArgs } from "./normalize/parse-submit-review-decision-args";
import { submitReviewDecision } from "./usecase/submit-review-decision";
import { GraphqlResolverEvent } from "../shared/types";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  assertAdminGroup(event.identity);
  const parsed = parseSubmitReviewDecisionArgs(
    (event.arguments ?? {}) as Record<string, unknown>,
  );
  return submitReviewDecision(parsed);
};
