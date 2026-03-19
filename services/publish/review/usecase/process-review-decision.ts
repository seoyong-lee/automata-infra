import { sendTaskSuccess } from "../../../shared/lib/aws/runtime";
import { resolveNextStatus } from "../mapper/resolve-next-status";
import {
  getReviewJob,
  persistReviewDecision,
  updateReviewJobStatus,
} from "../repo/review-store";
import { ReviewAction } from "../normalize/parse-review-body";

export const processReviewDecision = async (input: {
  jobId: string;
  action: ReviewAction;
  regenerationScope: string;
}): Promise<{
  ok: boolean;
  statusCode: number;
  error?: string;
}> => {
  const job = await getReviewJob(input.jobId);

  if (!job?.reviewTaskToken) {
    return {
      ok: false,
      statusCode: 404,
      error: "pending review task not found",
    };
  }

  await persistReviewDecision(input);
  await updateReviewJobStatus({
    jobId: input.jobId,
    action: input.action,
    regenerationScope: input.regenerationScope,
    status: resolveNextStatus(input.action),
  });

  await sendTaskSuccess(job.reviewTaskToken, {
    action: input.action,
    regenerationScope: input.regenerationScope,
  });

  return {
    ok: true,
    statusCode: 200,
  };
};
