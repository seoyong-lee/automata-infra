import { JobMetaItem } from "../../../../shared/lib/store/video-jobs";

export const mapPendingReview = (job: JobMetaItem) => {
  return {
    jobId: job.jobId,
    previewS3Key: job.reviewPreviewS3Key ?? job.previewS3Key ?? null,
    reviewRequestedAt: job.reviewRequestedAt ?? null,
    reviewAction: job.reviewAction ?? null,
    status: job.status,
  };
};
