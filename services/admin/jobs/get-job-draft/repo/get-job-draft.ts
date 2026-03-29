import {
  getJobOrThrow,
  getStoredContentBrief,
  getStoredJobBrief,
  getStoredJobPlan,
  getStoredSceneJson,
  listStoredBackgroundMusicAssets,
  listStoredFinalRenderArtifacts,
  listStoredSceneAssets,
} from "../../../shared/repo/job-draft-store";
import { mapJobDraftDetail } from "../../../shared/mapper/map-job-draft-detail";

export const getJobDraft = async (jobId: string) => {
  const job = await getJobOrThrow(jobId);
  const [
    contentBrief,
    jobBrief,
    jobPlan,
    sceneJson,
    assets,
    backgroundMusicOptions,
    renderArtifacts,
  ] = await Promise.all([
    getStoredContentBrief(job),
    getStoredJobBrief(job),
    getStoredJobPlan(job),
    getStoredSceneJson(job),
    listStoredSceneAssets(jobId),
    listStoredBackgroundMusicAssets(jobId),
    listStoredFinalRenderArtifacts(jobId),
  ]);

  return mapJobDraftDetail({
    job,
    contentBrief,
    jobBrief,
    jobPlan,
    sceneJson,
    assets,
    backgroundMusicOptions,
    renderArtifacts,
    assetMenuModel:
      jobBrief?.resolvedPolicy?.assetMenu ??
      contentBrief?.resolvedPolicy?.assetMenu,
  });
};
