import { mapJobMetaToAdminJob } from "./map-job-meta-to-admin-job";
import type { JobMetaItem } from "../../../../shared/lib/store/video-jobs";
import type {
  BackgroundMusicAssetDto,
  ContentBriefDto,
  JobDraftDetailDto,
  SceneAssetDto,
  SceneJsonDto,
  TopicSeedDto,
} from "../types";

export const mapJobDraftDetail = (input: {
  job: JobMetaItem;
  contentBrief?: ContentBriefDto;
  topicSeed?: TopicSeedDto;
  topicPlan?: TopicSeedDto;
  sceneJson?: SceneJsonDto;
  assets: SceneAssetDto[];
  backgroundMusicOptions: BackgroundMusicAssetDto[];
}): JobDraftDetailDto => {
  return {
    job: mapJobMetaToAdminJob(input.job),
    contentBrief: input.contentBrief,
    topicSeed: input.topicSeed,
    topicPlan: input.topicPlan,
    sceneJson: input.sceneJson,
    assets: input.assets,
    backgroundMusicOptions: input.backgroundMusicOptions,
  };
};
