import { processReviewDecision } from "../../../../publish/review/usecase/process-review-decision";
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
    throw new Error(result.error ?? "review decision failed");
  }

  return {
    ok: true,
    jobId: input.jobId,
    action: input.action.toUpperCase(),
    regenerationScope: input.regenerationScope,
    status: "REVIEW_DECISION_RECORDED",
  };
};
