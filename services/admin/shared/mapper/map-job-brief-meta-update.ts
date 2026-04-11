import type { ContentBriefDto, JobBriefDto } from "../types";

const jobYoutubePublishForMeta = (
  jobBrief: JobBriefDto,
): Record<string, unknown> => {
  const o: Record<string, unknown> = {};
  if (jobBrief.youtubePublishTitle !== undefined) {
    o.youtubePublishTitle = jobBrief.youtubePublishTitle;
  }
  if (jobBrief.youtubePublishDescription !== undefined) {
    o.youtubePublishDescription = jobBrief.youtubePublishDescription;
  }
  if (jobBrief.youtubePublishCategoryId !== undefined) {
    o.youtubePublishCategoryId = jobBrief.youtubePublishCategoryId;
  }
  if (jobBrief.youtubePublishDefaultLanguage !== undefined) {
    o.youtubePublishDefaultLanguage = jobBrief.youtubePublishDefaultLanguage;
  }
  return o;
};

export const mapJobBriefMetaUpdate = (jobBrief: JobBriefDto) => {
  return {
    jobBriefS3Key: undefined,
    contentId: jobBrief.contentId,
    presetId: jobBrief.presetId,
    presetFormat: jobBrief.presetSnapshot?.format,
    presetDuration: jobBrief.presetSnapshot?.duration,
    presetPlatformPreset: jobBrief.resolvedPolicy?.primaryPlatformPreset,
    language: jobBrief.targetLanguage,
    targetDurationSec: jobBrief.targetDurationSec,
    videoTitle: jobBrief.titleIdea,
    ...jobYoutubePublishForMeta(jobBrief),
    /** 잡 단위 태그 필드는 폐기됨; 업로드 시 빈 목록으로 덮어 레거시 Dynamo 값을 제거한다. */
    youtubePublishTags: [],
  };
};

export const mapContentBriefMetaUpdate = (contentBrief: ContentBriefDto) => {
  return {
    contentBriefS3Key: undefined,
    contentType: contentBrief.contentType,
    variant: contentBrief.variant,
    contentId: contentBrief.contentId,
    presetId: contentBrief.presetId,
    presetFormat: contentBrief.presetSnapshot?.format,
    presetDuration: contentBrief.presetSnapshot?.duration,
    presetPlatformPreset: contentBrief.resolvedPolicy?.primaryPlatformPreset,
    language: contentBrief.language,
    targetDurationSec: contentBrief.targetDurationSec,
    videoTitle: contentBrief.titleIdea,
    autoPublish: contentBrief.autoPublish ?? false,
    publishAt: contentBrief.publishAt,
  };
};

export const mapJobPlanMetaUpdate = (jobPlan: JobBriefDto) => {
  return {
    jobPlanS3Key: undefined,
    contentId: jobPlan.contentId,
    language: jobPlan.targetLanguage,
    targetDurationSec: jobPlan.targetDurationSec,
    videoTitle: jobPlan.titleIdea,
    ...jobYoutubePublishForMeta(jobPlan),
    youtubePublishTags: [],
  };
};
