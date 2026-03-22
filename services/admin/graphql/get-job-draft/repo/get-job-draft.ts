import {
  getJobOrThrow,
  getStoredContentBrief,
  getStoredSceneJson,
  getStoredTopicPlan,
  getStoredTopicSeed,
  listStoredBackgroundMusicAssets,
  listStoredSceneAssets,
} from "../../shared/repo/job-draft-store";
import { mapJobDraftDetail } from "../../shared/mapper/map-job-draft-detail";

export const getJobDraft = async (jobId: string) => {
  const job = await getJobOrThrow(jobId);
  const [contentBrief, topicSeed, topicPlan, sceneJson, assets, backgroundMusicOptions] =
    await Promise.all([
      getStoredContentBrief(job),
      getStoredTopicSeed(job),
      getStoredTopicPlan(job),
      getStoredSceneJson(job),
      listStoredSceneAssets(jobId),
      listStoredBackgroundMusicAssets(jobId),
    ]);

  return mapJobDraftDetail({
    job,
    contentBrief,
    topicSeed,
    topicPlan,
    sceneJson,
    assets,
    backgroundMusicOptions,
  });
};
