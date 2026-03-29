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

const isSelectedRenderArtifact = (
  job: Awaited<ReturnType<typeof getJobOrThrow>>,
  item: {
    finalVideoS3Key?: string | null;
    previewS3Key?: string | null;
    thumbnailS3Key?: string | null;
  },
): boolean => {
  return (
    item.finalVideoS3Key === job.finalVideoS3Key &&
    item.previewS3Key === job.previewS3Key &&
    item.thumbnailS3Key === job.thumbnailS3Key
  );
};

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
    renderArtifacts: renderArtifactItems.map((item) =>
      mapRenderArtifactDraft(item, isSelectedRenderArtifact(job, item)),
    ),
    assetMenuModel:
      jobBrief?.resolvedPolicy?.assetMenu ??
      contentBrief?.resolvedPolicy?.assetMenu,
  });
};

export const getJobDraft = getAdminJobDraft;
