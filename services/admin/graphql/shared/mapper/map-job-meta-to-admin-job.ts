import { JobMetaItem } from "../../../../shared/lib/store/video-jobs";
import { AdminJobDto } from "../types";

export const mapJobMetaToAdminJob = (job: JobMetaItem): AdminJobDto => {
  return {
    jobId: job.jobId,
    channelId: job.channelId,
    topicId: job.topicId,
    status: job.status,
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
    reviewAction: job.reviewAction,
    reviewRequestedAt: job.reviewRequestedAt,
    uploadStatus: job.uploadStatus,
    uploadVideoId: job.uploadVideoId,
  };
};
