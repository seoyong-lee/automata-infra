import { mapJobMetaToAdminJob } from "./map-job-meta-to-admin-job";
import type { JobMetaItem } from "../../../../shared/lib/store/video-jobs";
import type {
  BackgroundMusicAssetDto,
  ContentBriefDto,
  JobBriefDto,
  JobDraftDetailDto,
  SceneAssetDto,
  SceneJsonDto,
} from "../types";

export const mapJobDraftDetail = (input: {
  job: JobMetaItem;
  contentBrief?: ContentBriefDto;
  jobBrief?: JobBriefDto;
  jobPlan?: JobBriefDto;
  sceneJson?: SceneJsonDto;
  assets: SceneAssetDto[];
  backgroundMusicOptions: BackgroundMusicAssetDto[];
}): JobDraftDetailDto => {
  return {
    job: mapJobMetaToAdminJob(input.job),
    contentBrief: input.contentBrief,
    jobBrief: input.jobBrief,
    jobPlan: input.jobPlan,
    sceneJson: input.sceneJson,
    assets: input.assets,
    backgroundMusicOptions: input.backgroundMusicOptions,
  };
};
