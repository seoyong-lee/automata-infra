import { processReviewDecision } from "../../../../publish/review/usecase/process-review-decision";
import { GraphqlResolverError } from "../../shared/errors";
import { mapReviewAction } from "../mapper/map-review-action";

export const submitReviewDecision = async (input: {
  jobId: string;
  action: string;
  regenerationScope: string;
}) => {
  const result = await processReviewDecision({
    jobId: input.jobId,
    action: mapReviewAction(input.action),
    regenerationScope: input.regenerationScope,
  });

  if (!result.ok) {
    if (result.statusCode === 404) {
      throw new GraphqlResolverError({
        code: "NOT_FOUND",
        message: result.error ?? "pending review task not found",
      });
    }
    throw new GraphqlResolverError({
      code: "CONFLICT",
      message: result.error ?? "review decision failed",
    });
  }

  return {
    ok: true,
    jobId: input.jobId,
    action: input.action.toUpperCase(),
    regenerationScope: input.regenerationScope,
    status: "REVIEW_DECISION_RECORDED",
  };
};
