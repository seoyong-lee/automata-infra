import {
  putReviewRecord,
  updateJobMeta,
} from "../../../shared/lib/store/video-jobs";

export const persistReviewRequest = async (input: {
  jobId: string;
  previewS3Key: string;
  queuedAt: string;
  taskToken: string;
}): Promise<void> => {
  await putReviewRecord(input.jobId, {
    action: "PENDING",
    previewS3Key: input.previewS3Key,
    queuedAt: input.queuedAt,
  });

  await updateJobMeta(
    input.jobId,
    {
      reviewTaskToken: input.taskToken,
      reviewRequestedAt: input.queuedAt,
      reviewPreviewS3Key: input.previewS3Key,
      reviewAction: "PENDING",
    },
    "REVIEW_PENDING",
  );
};
