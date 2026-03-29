import { invokePipelineWorkerAsync } from "../../../../shared/lib/aws/invoke-pipeline-worker";
import {
  startJobExecution,
  startQueuedJobExecution,
} from "../../../../shared/lib/store/job-execution";
import { getJobOrThrow } from "../../../shared/repo/job-draft-store";
import { mapJobMetaToAdminJob } from "../../../shared/mapper/map-job-meta-to-admin-job";
import { buildSceneJson } from "../../../../script/usecase/build-scene-json";
import {
  loadSceneJsonBuildInput,
  resolveSceneJsonInputSnapshotId,
} from "../repo/load-scene-json-build-input";
import {
  markSceneJsonBuilding,
  persistGeneratedSceneJson,
} from "../repo/persist-generated-scene-json";

const pipelineAsyncEnabled = (): boolean =>
  (process.env.PIPELINE_ASYNC_INVOCATION === "1" ||
    process.env.PIPELINE_ASYNC_INVOCATION === "true") &&
  Boolean(process.env.PIPELINE_WORKER_FUNCTION_NAME?.trim());

export const runSceneJsonCore = async (jobId: string) => {
  const { sceneJsonInput } = await loadSceneJsonBuildInput(jobId);
  await markSceneJsonBuilding(jobId);
  const sceneJson = await buildSceneJson(sceneJsonInput);
  const sceneJsonS3Key = await persistGeneratedSceneJson(jobId, sceneJson);

  const updated = await getJobOrThrow(jobId);
  return mapJobMetaToAdminJob(updated);
};

export const runAdminSceneJson = async (
  jobId: string,
  triggeredBy?: string,
) => {
  const inputSnapshotId = await resolveSceneJsonInputSnapshotId(jobId);

  if (pipelineAsyncEnabled()) {
    const { sk, finish } = await startQueuedJobExecution({
      jobId,
      stageType: "SCENE_JSON",
      triggeredBy,
      inputSnapshotId,
    });
    try {
      await invokePipelineWorkerAsync({
        jobId,
        executionSk: sk,
        stage: "SCENE_JSON",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await finish("FAILED", msg);
      throw e;
    }
    const job = await getJobOrThrow(jobId);
    return mapJobMetaToAdminJob(job);
  }

  const { finish } = await startJobExecution({
    jobId,
    stageType: "SCENE_JSON",
    triggeredBy,
    inputSnapshotId,
  });
  try {
    const result = await runSceneJsonCore(jobId);
    await finish("SUCCEEDED", undefined, result.sceneJsonS3Key);
    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await finish("FAILED", msg);
    throw e;
  }
};
