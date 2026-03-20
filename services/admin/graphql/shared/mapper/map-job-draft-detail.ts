import { mapJobMetaToAdminJob } from "./map-job-meta-to-admin-job";
import type { JobMetaItem } from "../../../../shared/lib/store/video-jobs";
import type {
  JobDraftDetailDto,
  SceneAssetDto,
  SceneJsonDto,
  TopicSeedDto,
} from "../types";

export const mapJobDraftDetail = (input: {
  job: JobMetaItem;
  topicSeed?: TopicSeedDto;
  topicPlan?: TopicSeedDto;
  sceneJson?: SceneJsonDto;
  assets: SceneAssetDto[];
}): JobDraftDetailDto => {
  return {
    job: mapJobMetaToAdminJob(input.job),
    topicSeed: input.topicSeed,
    topicPlan: input.topicPlan,
    sceneJson: input.sceneJson,
    assets: input.assets,
  };
};
