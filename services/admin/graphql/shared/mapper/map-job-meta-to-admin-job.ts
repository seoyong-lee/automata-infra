import { JobMetaItem } from "../../../../shared/lib/store/video-jobs";
import { AdminJobDto, JobStatus, ReviewAction, UploadStatus } from "../types";

const toJobStatus = (status: string): JobStatus => status as JobStatus;

const toReviewAction = (action?: string): ReviewAction | undefined => {
  if (!action) {
    return undefined;
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
  return undefined;
};

const toUploadStatus = (status?: string): UploadStatus | undefined => {
  if (status === "QUEUED" || status === "UPLOADED") {
    return status;
  }
  return undefined;
};

export const mapJobMetaToAdminJob = (job: JobMetaItem): AdminJobDto => {
  return {
    jobId: job.jobId,
    contentId: job.contentId,
    topicId: job.topicId,
    status: toJobStatus(job.status),
    contentType: job.contentType,
    variant: job.variant,
    autoPublish: job.autoPublish,
    publishAt: job.publishAt,
    language: job.language,
    targetDurationSec: job.targetDurationSec,
    videoTitle: job.videoTitle,
    retryCount: job.retryCount,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    sceneJsonS3Key: job.sceneJsonS3Key,
    renderPlanS3Key: job.renderPlanS3Key,
    finalVideoS3Key: job.finalVideoS3Key,
    thumbnailS3Key: job.thumbnailS3Key,
    previewS3Key: job.previewS3Key,
    reviewAction: toReviewAction(job.reviewAction),
    reviewRequestedAt: job.reviewRequestedAt,
    uploadStatus: toUploadStatus(job.uploadStatus),
    uploadVideoId: job.uploadVideoId,
    contentBriefS3Key: job.contentBriefS3Key,
    topicSeedS3Key: job.topicSeedS3Key,
    topicS3Key: job.topicS3Key,
  };
};
