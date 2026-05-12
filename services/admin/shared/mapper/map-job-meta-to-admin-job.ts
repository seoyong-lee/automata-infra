import { JobMetaItem } from "../../../shared/lib/store/video-jobs";
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
    status: toJobStatus(job.status),
    contentType: job.contentType,
    variant: job.variant,
    presetId: job.presetId,
    presetFormat: job.presetFormat,
    presetDuration: job.presetDuration,
    presetPlatformPreset: job.presetPlatformPreset,
    autoPublish: job.autoPublish,
    publishAt: job.publishAt,
    language: job.language,
    targetDurationSec: job.targetDurationSec,
    videoTitle: job.videoTitle,
    youtubePublishTitle: job.youtubePublishTitle,
    youtubePublishDescription: job.youtubePublishDescription,
    youtubePublishTags: job.youtubePublishTags,
    youtubePublishCategoryId: job.youtubePublishCategoryId,
    youtubePublishDefaultLanguage: job.youtubePublishDefaultLanguage,
    retryCount: job.retryCount,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    sceneJsonS3Key: job.sceneJsonS3Key,
    assetManifestS3Key: job.assetManifestS3Key,
    renderPlanS3Key: job.renderPlanS3Key,
    finalVideoS3Key: job.finalVideoS3Key,
    thumbnailS3Key: job.thumbnailS3Key,
    previewS3Key: job.previewS3Key,
    reviewAction: toReviewAction(job.reviewAction),
    reviewRequestedAt: job.reviewRequestedAt,
    uploadStatus: toUploadStatus(job.uploadStatus),
    uploadVideoId: job.uploadVideoId,
    contentBriefS3Key: job.contentBriefS3Key,
    jobBriefS3Key: job.jobBriefS3Key,
    jobPlanS3Key: job.jobPlanS3Key,
    approvedPlanExecutionId: job.approvedPlanExecutionId,
    approvedSceneExecutionId: job.approvedSceneExecutionId,
    approvedAssetExecutionId: job.approvedAssetExecutionId,
    defaultVoiceProfileId: job.defaultVoiceProfileId,
    backgroundMusicS3Key: job.backgroundMusicS3Key,
    masterVideoS3Key: job.masterVideoS3Key,
    sourceVideoFrameExtractStatus: job.sourceVideoFrameExtractStatus,
    sourceVideoFrameExtractError: job.sourceVideoFrameExtractError ?? undefined,
    sourceVideoFrameExtractStartedAt: job.sourceVideoFrameExtractStartedAt,
    sourceVideoFrameExtractCompletedAt: job.sourceVideoFrameExtractCompletedAt,
    sourceVideoFrameExtractInsightS3Key: job.sourceVideoFrameExtractInsightS3Key,
  };
};
