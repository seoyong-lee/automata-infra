import { getJsonFromS3, putJsonToS3 } from "../../../../shared/lib/aws/runtime";
import {
  type JobMetaItem,
  type SceneAssetItem,
  getJobMeta,
  listSceneAssets,
  updateJobMeta,
} from "../../../../shared/lib/store/video-jobs";
import type { SceneJsonDto, SceneJsonSceneDto, TopicSeedDto } from "../types";
import type { SceneJson } from "../../../../../types/render/scene-json";

export const buildTopicSeedKey = (jobId: string): string => {
  return `drafts/${jobId}/topic-seed.json`;
};

export const buildTopicPlanKey = (jobId: string): string => {
  return `topics/${jobId}/topic.json`;
};

const mapScene = (scene: SceneJson["scenes"][number]): SceneJsonSceneDto => {
  return {
    sceneId: scene.sceneId,
    durationSec: scene.durationSec,
    narration: scene.narration,
    imagePrompt: scene.imagePrompt,
    videoPrompt: scene.videoPrompt,
    subtitle: scene.subtitle,
    bgmMood: scene.bgmMood,
    sfx: scene.sfx,
  };
};

const mapSceneJson = (sceneJson: SceneJson): SceneJsonDto => {
  return {
    videoTitle: sceneJson.videoTitle,
    language: sceneJson.language,
    scenes: sceneJson.scenes.map(mapScene),
  };
};

const mapSceneAsset = (asset: SceneAssetItem) => {
  return {
    sceneId: asset.sceneId,
    imageS3Key: asset.imageS3Key,
    videoClipS3Key: asset.videoClipS3Key,
    voiceS3Key: asset.voiceS3Key,
    durationSec: asset.durationSec,
    narration: asset.narration,
    subtitle: asset.subtitle,
    imagePrompt: asset.imagePrompt,
    videoPrompt: asset.videoPrompt,
    validationStatus: asset.validationStatus,
  };
};

export const getStoredTopicSeed = async (
  job: JobMetaItem,
): Promise<TopicSeedDto | undefined> => {
  const key = job.topicSeedS3Key;
  if (!key) {
    return undefined;
  }
  return (await getJsonFromS3<TopicSeedDto>(key)) ?? undefined;
};

export const getStoredTopicPlan = async (
  job: JobMetaItem,
): Promise<TopicSeedDto | undefined> => {
  const key = job.topicS3Key;
  if (!key) {
    return undefined;
  }
  return (await getJsonFromS3<TopicSeedDto>(key)) ?? undefined;
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
  return assets.map(mapSceneAsset);
};

export const saveTopicSeed = async (input: {
  jobId: string;
  topicSeed: TopicSeedDto;
  status?: string;
}): Promise<string> => {
  const key = buildTopicSeedKey(input.jobId);
  await putJsonToS3(key, input.topicSeed);
  await updateJobMeta(
    input.jobId,
    {
      topicSeedS3Key: key,
      channelId: input.topicSeed.channelId,
      language: input.topicSeed.targetLanguage,
      targetDurationSec: input.topicSeed.targetDurationSec,
      videoTitle: input.topicSeed.titleIdea,
    },
    input.status,
  );
  return key;
};

export const saveTopicPlan = async (input: {
  jobId: string;
  topicPlan: TopicSeedDto;
  status?: string;
}): Promise<string> => {
  const key = buildTopicPlanKey(input.jobId);
  await putJsonToS3(key, input.topicPlan);
  await updateJobMeta(
    input.jobId,
    {
      topicS3Key: key,
      channelId: input.topicPlan.channelId,
      language: input.topicPlan.targetLanguage,
      targetDurationSec: input.topicPlan.targetDurationSec,
      videoTitle: input.topicPlan.titleIdea,
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
