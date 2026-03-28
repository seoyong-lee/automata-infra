import {
  getJsonFromS3,
  listObjectsFromS3,
  putJsonToS3,
} from "../../../shared/lib/aws/runtime";
import {
  type JobMetaItem,
  type SceneAssetItem,
  getJobMeta,
  listSceneImageCandidates,
  listSceneAssets,
  listSceneVoiceCandidates,
  updateJobMeta,
} from "../../../shared/lib/store/video-jobs";
import {
  alignSceneJsonNarrationAndSubtitle,
  alignSceneNarrationAndSubtitle,
} from "../../../shared/lib/scene-text";
import type {
  BackgroundMusicAssetDto,
  ContentBriefDto,
  JobBriefDto,
  SceneJsonDto,
  SceneJsonSceneDto,
} from "../types";
import type { SceneJson } from "../../../../types/render/scene-json";

export const buildJobBriefKey = (jobId: string): string => {
  return `drafts/${jobId}/job-brief.json`;
};

export const buildContentBriefKey = (jobId: string): string => {
  return `drafts/${jobId}/content-brief.json`;
};

export const buildJobPlanKey = (jobId: string): string => {
  return `plans/${jobId}/job-plan.json`;
};

const mapScene = (scene: SceneJson["scenes"][number]): SceneJsonSceneDto => {
  const alignedScene = alignSceneNarrationAndSubtitle(scene);
  return {
    sceneId: alignedScene.sceneId,
    durationSec: alignedScene.durationSec,
    narration: alignedScene.narration,
    disableNarration: alignedScene.disableNarration,
    imagePrompt: alignedScene.imagePrompt,
    videoPrompt: alignedScene.videoPrompt,
    subtitle: alignedScene.subtitle,
    bgmMood: alignedScene.bgmMood,
    sfx: alignedScene.sfx,
  };
};

const mapSceneJson = (sceneJson: SceneJson): SceneJsonDto => {
  const alignedSceneJson = alignSceneJsonNarrationAndSubtitle(sceneJson);
  return {
    videoTitle: alignedSceneJson.videoTitle,
    language: alignedSceneJson.language,
    scenes: alignedSceneJson.scenes.map(mapScene),
  };
};

const mapSceneAsset = (asset: SceneAssetItem) => {
  const alignedAsset = alignSceneNarrationAndSubtitle(asset);
  return {
    sceneId: alignedAsset.sceneId,
    imageS3Key: alignedAsset.imageS3Key,
    videoClipS3Key: alignedAsset.videoClipS3Key,
    voiceS3Key: alignedAsset.voiceS3Key,
    voiceSelectedCandidateId:
      typeof alignedAsset.voiceSelectedCandidateId === "string"
        ? alignedAsset.voiceSelectedCandidateId
        : undefined,
    voiceProfileId:
      typeof alignedAsset.voiceProfileId === "string"
        ? alignedAsset.voiceProfileId
        : undefined,
    voiceDurationSec:
      typeof alignedAsset.voiceDurationSec === "number"
        ? alignedAsset.voiceDurationSec
        : undefined,
    durationSec: alignedAsset.durationSec,
    narration: alignedAsset.narration,
    subtitle: alignedAsset.subtitle,
    imagePrompt: alignedAsset.imagePrompt,
    videoPrompt: alignedAsset.videoPrompt,
    validationStatus: alignedAsset.validationStatus,
    imageSelectedCandidateId:
      typeof alignedAsset.imageSelectedCandidateId === "string"
        ? alignedAsset.imageSelectedCandidateId
        : undefined,
  };
};

export const getStoredJobBrief = async (
  job: JobMetaItem,
): Promise<JobBriefDto | undefined> => {
  const key = job.jobBriefS3Key;
  if (!key) {
    return undefined;
  }
  return (await getJsonFromS3<JobBriefDto>(key)) ?? undefined;
};

export const getStoredContentBrief = async (
  job: JobMetaItem,
): Promise<ContentBriefDto | undefined> => {
  const key = job.contentBriefS3Key;
  if (!key) {
    return undefined;
  }
  return (await getJsonFromS3<ContentBriefDto>(key)) ?? undefined;
};

export const getStoredJobPlan = async (
  job: JobMetaItem,
): Promise<JobBriefDto | undefined> => {
  const key = job.jobPlanS3Key;
  if (!key) {
    return undefined;
  }
  return (await getJsonFromS3<JobBriefDto>(key)) ?? undefined;
};

export const getStoredSceneJson = async (
  job: JobMetaItem,
): Promise<SceneJsonDto | undefined> => {
  const key = job.sceneJsonS3Key;
  if (!key) {
    return undefined;
  }
  const payload = await getJsonFromS3<SceneJson>(key);
  return payload ? mapSceneJson(payload) : undefined;
};

export const listStoredSceneAssets = async (jobId: string) => {
  const assets = await listSceneAssets(jobId);
  return Promise.all(
    assets.map(async (asset) => {
      const imageCandidates = await listSceneImageCandidates(
        jobId,
        asset.sceneId,
      );
      const voiceCandidates = await listSceneVoiceCandidates(
        jobId,
        asset.sceneId,
      );
      const selectedCandidateId =
        typeof asset.imageSelectedCandidateId === "string"
          ? asset.imageSelectedCandidateId
          : undefined;
      const selectedVoiceCandidateId =
        typeof asset.voiceSelectedCandidateId === "string"
          ? asset.voiceSelectedCandidateId
          : undefined;
      return {
        ...mapSceneAsset(asset),
        imageCandidates: imageCandidates.map((candidate) => ({
          candidateId: candidate.candidateId,
          imageS3Key: candidate.imageS3Key,
          provider: candidate.provider,
          providerLogS3Key: candidate.providerLogS3Key,
          promptHash: candidate.promptHash,
          mocked: candidate.mocked,
          createdAt: candidate.createdAt,
          selected:
            selectedCandidateId !== undefined
              ? candidate.candidateId === selectedCandidateId
              : candidate.imageS3Key === asset.imageS3Key,
        })),
        voiceCandidates: voiceCandidates.map((candidate) => ({
          candidateId: candidate.candidateId,
          voiceS3Key: candidate.voiceS3Key,
          provider: candidate.provider,
          providerLogS3Key: candidate.providerLogS3Key,
          mocked: candidate.mocked,
          voiceDurationSec: candidate.voiceDurationSec,
          voiceProfileId: candidate.voiceProfileId,
          createdAt: candidate.createdAt,
          selected:
            selectedVoiceCandidateId !== undefined
              ? candidate.candidateId === selectedVoiceCandidateId
              : candidate.voiceS3Key === asset.voiceS3Key,
        })),
      };
    }),
  );
};

const BACKGROUND_MUSIC_PREFIX = (jobId: string) => `assets/${jobId}/bgm/`;
const AUDIO_EXTENSION_RE = /\.(mp3|wav|m4a|aac|ogg)$/i;

export const listStoredBackgroundMusicAssets = async (
  jobId: string,
): Promise<BackgroundMusicAssetDto[]> => {
  const items = await listObjectsFromS3(BACKGROUND_MUSIC_PREFIX(jobId));

  return items
    .filter((item) => AUDIO_EXTENSION_RE.test(item.key))
    .sort((left, right) => {
      const l = new Date(left.lastModified ?? 0).getTime();
      const r = new Date(right.lastModified ?? 0).getTime();
      return r - l;
    })
    .map((item) => ({
      s3Key: item.key,
      fileName: item.key.split("/").pop() ?? item.key,
      uploadedAt: item.lastModified,
      sizeBytes: item.size,
    }));
};

export const saveJobBrief = async (input: {
  jobId: string;
  jobBrief: JobBriefDto;
  status?: string;
}): Promise<string> => {
  const key = buildJobBriefKey(input.jobId);
  await putJsonToS3(key, input.jobBrief);
  await updateJobMeta(
    input.jobId,
    {
      jobBriefS3Key: key,
      contentId: input.jobBrief.contentId,
      presetId: input.jobBrief.presetId,
      presetFormat: input.jobBrief.presetSnapshot?.format,
      presetDuration: input.jobBrief.presetSnapshot?.duration,
      presetPlatformPreset:
        input.jobBrief.resolvedPolicy?.primaryPlatformPreset,
      language: input.jobBrief.targetLanguage,
      targetDurationSec: input.jobBrief.targetDurationSec,
      videoTitle: input.jobBrief.titleIdea,
    },
    input.status,
  );
  return key;
};

export const saveContentBrief = async (input: {
  jobId: string;
  contentBrief: ContentBriefDto;
  status?: string;
}): Promise<string> => {
  const key = buildContentBriefKey(input.jobId);
  await putJsonToS3(key, input.contentBrief);
  await updateJobMeta(
    input.jobId,
    {
      contentBriefS3Key: key,
      contentType: input.contentBrief.contentType,
      variant: input.contentBrief.variant,
      contentId: input.contentBrief.contentId,
      presetId: input.contentBrief.presetId,
      presetFormat: input.contentBrief.presetSnapshot?.format,
      presetDuration: input.contentBrief.presetSnapshot?.duration,
      presetPlatformPreset:
        input.contentBrief.resolvedPolicy?.primaryPlatformPreset,
      language: input.contentBrief.language,
      targetDurationSec: input.contentBrief.targetDurationSec,
      videoTitle: input.contentBrief.titleIdea,
      autoPublish: input.contentBrief.autoPublish ?? false,
      publishAt: input.contentBrief.publishAt,
    },
    input.status,
  );
  return key;
};

export const saveJobPlan = async (input: {
  jobId: string;
  jobPlan: JobBriefDto;
  status?: string;
}): Promise<string> => {
  const key = buildJobPlanKey(input.jobId);
  await putJsonToS3(key, input.jobPlan);
  await updateJobMeta(
    input.jobId,
    {
      jobPlanS3Key: key,
      contentId: input.jobPlan.contentId,
      language: input.jobPlan.targetLanguage,
      targetDurationSec: input.jobPlan.targetDurationSec,
      videoTitle: input.jobPlan.titleIdea,
    },
    input.status,
  );
  return key;
};

export const getJobOrThrow = async (jobId: string): Promise<JobMetaItem> => {
  const item = await getJobMeta(jobId);
  if (!item) {
    throw new Error("job not found");
  }
  return item;
};
