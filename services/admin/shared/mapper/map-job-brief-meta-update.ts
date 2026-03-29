import type { ContentBriefDto, JobBriefDto } from "../types";

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
  };
};
