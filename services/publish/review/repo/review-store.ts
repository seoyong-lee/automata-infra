import {
  getJobMeta,
  putReviewRecord,
  updateJobMeta,
} from "../../../shared/lib/store/video-jobs";
import { ReviewAction } from "../normalize/parse-review-body";

export const getReviewJob = async (jobId: string) => {
  return getJobMeta(jobId);
};

export const persistReviewDecision = async (input: {
  jobId: string;
  action: ReviewAction;
  regenerationScope: string;
  targetSceneId?: number;
}): Promise<void> => {
  await putReviewRecord(input.jobId, {
    action: input.action,
    regenerationScope: input.regenerationScope,
    ...(typeof input.targetSceneId === "number"
      ? { targetSceneId: input.targetSceneId }
      : {}),
    decidedAt: new Date().toISOString(),
  });

  await updateJobMeta(input.jobId, {
    reviewTaskToken: null,
    reviewAction: input.action,
  });
};

export const updateReviewJobStatus = async (input: {
  jobId: string;
  regenerationScope: string;
  action: ReviewAction;
  status: "APPROVED" | "REJECTED" | "ASSET_GENERATING";
}): Promise<void> => {
  await updateJobMeta(
    input.jobId,
    input.action === "regenerate"
      ? { regenerationScope: input.regenerationScope }
      : {},
    input.status,
  );
};
