import { JobMetaItem } from "../../../../shared/lib/store/video-jobs";
import { JobStatus, ReviewAction } from "../../shared/types";

const toJobStatus = (status: string): JobStatus => status as JobStatus;

const toReviewAction = (action?: string): ReviewAction | null => {
  if (!action) {
    return null;
  }
  const normalized = action.toUpperCase();
  if (
    normalized === "PENDING" ||
    normalized === "APPROVE" ||
    normalized === "REJECT" ||
    normalized === "REGENERATE"
  ) {
    return normalized;
  }
  return null;
};

export const mapPendingReview = (job: JobMetaItem) => {
  return {
    jobId: job.jobId,
    previewS3Key: job.reviewPreviewS3Key ?? job.previewS3Key ?? null,
    reviewRequestedAt: job.reviewRequestedAt ?? null,
    reviewAction: toReviewAction(job.reviewAction),
    status: toJobStatus(job.status),
  };
};
