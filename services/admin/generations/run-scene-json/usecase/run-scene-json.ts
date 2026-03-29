import { getJobOrThrow } from "../../../shared/repo/job-draft-store";
import { mapJobMetaToAdminJob } from "../../../shared/mapper/map-job-meta-to-admin-job";
import { runAdminStageExecution } from "../../../shared/usecase/run-admin-stage-execution";
import { buildSceneJson } from "../../../../script/usecase/build-scene-json";
import {
  loadSceneJsonBuildInput,
  resolveSceneJsonInputSnapshotId,
} from "../repo/load-scene-json-build-input";
import {
  markSceneJsonBuilding,
  persistGeneratedSceneJson,
} from "../repo/persist-generated-scene-json";

export const runSceneJsonCore = async (jobId: string) => {
  const { sceneJsonInput } = await loadSceneJsonBuildInput(jobId);
  await markSceneJsonBuilding(jobId);
  const sceneJson = await buildSceneJson(sceneJsonInput);
  await persistGeneratedSceneJson(jobId, sceneJson);

  const updated = await getJobOrThrow(jobId);
  return mapJobMetaToAdminJob(updated);
};

export const runAdminSceneJson = async (
  jobId: string,
  triggeredBy?: string,
) => {
  const inputSnapshotId = await resolveSceneJsonInputSnapshotId(jobId);
  return runAdminStageExecution({
    jobId,
    stageType: "SCENE_JSON",
    triggeredBy,
    inputSnapshotId,
    runCore: () => runSceneJsonCore(jobId),
    getQueuedResult: async () =>
      mapJobMetaToAdminJob(await getJobOrThrow(jobId)),
    getSuccessSnapshot: (result) => result.sceneJsonS3Key,
  });
};
