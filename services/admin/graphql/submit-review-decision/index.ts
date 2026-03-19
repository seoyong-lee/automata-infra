import { Handler } from "aws-lambda";
import {
  assertAdminGroup,
  getActor,
} from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../shared/audit-log";
import { toGraphqlResolverError } from "../shared/errors";
import { parseSubmitReviewDecisionArgs } from "./normalize/parse-submit-review-decision-args";
import { submitReviewDecision } from "./usecase/submit-review-decision";
import { GraphqlResolverEvent } from "../shared/types";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const actor = getActor(event.identity);
  let jobId: string | undefined;
  let action: string | undefined;

  try {
    assertAdminGroup(event.identity);
    const parsed = parseSubmitReviewDecisionArgs(
      (event.arguments ?? {}) as Record<string, unknown>,
    );
    jobId = parsed.jobId;
    action = parsed.action;

    logResolverAudit({
      operation: "submitReviewDecision",
      operationType: "mutation",
      phase: "started",
      actor,
      jobId,
      action,
    });

    const result = await submitReviewDecision(parsed);

    logResolverAudit({
      operation: "submitReviewDecision",
      operationType: "mutation",
      phase: "succeeded",
      actor,
      jobId,
      action,
    });

    return result;
  } catch (error) {
    const mapped = toGraphqlResolverError(error);

    logResolverAudit({
      operation: "submitReviewDecision",
      operationType: "mutation",
      phase: "failed",
      actor,
      jobId,
      action,
      errorCode: mapped.code,
      errorMessage: mapped.message,
    });

    throw mapped;
  }
};
