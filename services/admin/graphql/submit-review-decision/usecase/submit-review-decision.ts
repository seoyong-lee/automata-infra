import { processReviewDecision } from "../../../../publish/review/usecase/process-review-decision";
import type { SubmitReviewDecisionInput } from "../../../../shared/lib/contracts/review-decision-schema";
import { GraphqlResolverError } from "../../shared/errors";

const toGraphqlAction = (
  action: SubmitReviewDecisionInput["action"],
): "APPROVE" | "REJECT" | "REGENERATE" => {
  if (action === "approve") {
    return "APPROVE";
  }
  if (action === "reject") {
    return "REJECT";
  }
  return "REGENERATE";
};

export const submitReviewDecision = async (
  input: SubmitReviewDecisionInput,
) => {
  const result = await processReviewDecision({
    jobId: input.jobId,
    action: input.action,
    regenerationScope: input.regenerationScope,
    targetSceneId: input.targetSceneId,
  });

  if (!result.ok) {
    if (result.statusCode === 404) {
      throw new GraphqlResolverError({
        code: "NOT_FOUND",
        message: result.error ?? "pending review task not found",
      });
    }
    if (result.statusCode === 400) {
      throw new GraphqlResolverError({
        code: "BAD_USER_INPUT",
        message: result.error ?? "invalid review decision",
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
    action: toGraphqlAction(input.action),
    regenerationScope: input.regenerationScope,
    ...(typeof input.targetSceneId === "number"
      ? { targetSceneId: input.targetSceneId }
      : {}),
    status: "REVIEW_DECISION_RECORDED" as const,
  };
};
