import { sendTaskSuccess } from "../../../shared/lib/aws/runtime";
import { submitReviewDecisionInputSchema } from "../../../shared/lib/contracts/review-decision-schema";
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
  targetSceneId?: number;
}): Promise<{
  ok: boolean;
  statusCode: number;
  error?: string;
}> => {
  const parsed = submitReviewDecisionInputSchema.safeParse({
    jobId: input.jobId,
    action: input.action,
    regenerationScope: input.regenerationScope,
    targetSceneId: input.targetSceneId,
  });
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ");
    return { ok: false, statusCode: 400, error: msg };
  }

  const job = await getReviewJob(input.jobId);

  if (!job?.reviewTaskToken) {
    return {
      ok: false,
      statusCode: 404,
      error: "pending review task not found",
    };
  }

  await persistReviewDecision({
    jobId: parsed.data.jobId,
    action: parsed.data.action,
    regenerationScope: parsed.data.regenerationScope,
    targetSceneId: parsed.data.targetSceneId,
  });
  await updateReviewJobStatus({
    jobId: parsed.data.jobId,
    action: parsed.data.action,
    regenerationScope: parsed.data.regenerationScope,
    status: resolveNextStatus(parsed.data.action),
  });

  const taskOutput: Record<string, unknown> = {
    action: parsed.data.action,
    regenerationScope: parsed.data.regenerationScope,
  };
  if (typeof parsed.data.targetSceneId === "number") {
    taskOutput.targetSceneId = parsed.data.targetSceneId;
  }

  await sendTaskSuccess(job.reviewTaskToken, taskOutput);

  return {
    ok: true,
    statusCode: 200,
  };
};
