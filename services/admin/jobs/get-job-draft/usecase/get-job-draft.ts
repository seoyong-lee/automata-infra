import {
  getJobOrThrow,
  getStoredContentBrief,
  getStoredJobBrief,
  getStoredJobPlan,
  getStoredSceneJsonRaw,
  listStoredBackgroundMusicAssets,
  listStoredFinalRenderArtifactItems,
  listStoredSceneAssetRecords,
} from "../../../shared/repo/job-draft-store";
import { mapJobDraftDetail } from "../../../shared/mapper/map-job-draft-detail";
import { mapRenderArtifactDraft } from "../../../shared/mapper/map-render-artifact-draft";
import { mapSceneAssetRecordDraft } from "../../../shared/mapper/map-scene-asset-record-draft";
import { mapSceneJsonDraft } from "../../../shared/mapper/map-scene-json-draft";

export const getAdminJobDraft = async (jobId: string) => {
  const job = await getJobOrThrow(jobId);
  const [
    contentBrief,
    jobBrief,
    jobPlan,
    sceneJson,
    assetRecords,
    backgroundMusicOptions,
    renderArtifactItems,
  ] = await Promise.all([
    getStoredContentBrief(job),
    getStoredJobBrief(job),
    getStoredJobPlan(job),
    getStoredSceneJsonRaw(job),
    listStoredSceneAssetRecords(jobId),
    listStoredBackgroundMusicAssets(jobId),
    listStoredFinalRenderArtifactItems(jobId),
  ]);

  return mapJobDraftDetail({
    job,
    contentBrief,
    jobBrief,
    jobPlan,
    sceneJson: sceneJson ? mapSceneJsonDraft(sceneJson) : undefined,
    assets: assetRecords.map(mapSceneAssetRecordDraft),
    backgroundMusicOptions,
    renderArtifacts: renderArtifactItems.map(mapRenderArtifactDraft),
    assetMenuModel:
      jobBrief?.resolvedPolicy?.assetMenu ??
      contentBrief?.resolvedPolicy?.assetMenu,
  });
};

export const getJobDraft = getAdminJobDraft;
