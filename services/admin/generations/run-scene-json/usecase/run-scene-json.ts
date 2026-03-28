import { getJsonFromS3, putJsonToS3 } from "../../../../shared/lib/aws/runtime";
import { invokePipelineWorkerAsync } from "../../../../shared/lib/aws/invoke-pipeline-worker";
import {
  startJobExecution,
  startQueuedJobExecution,
} from "../../../../shared/lib/store/job-execution";
import { resolveJobPlanS3KeyForSceneBuild } from "../../../shared/lib/resolve-approved-pipeline-input";
import { getJobOrThrow } from "../../../shared/repo/job-draft-store";
import { mapJobMetaToAdminJob } from "../../../shared/mapper/map-job-meta-to-admin-job";
import { updateJobMeta } from "../../../../shared/lib/store/video-jobs";
import { buildSceneJson } from "../../../../script/usecase/build-scene-json";
import { clearSceneAssets } from "../../../../script/repo/clear-scene-assets";
import type { JobPlanResult } from "../../../../plan/usecase/create-job-plan";
import { getSceneJsonKey } from "../../../../script/normalize/get-scene-json-key";
import { persistSceneAssets } from "../../../../script/repo/persist-scene-assets";
import type { JobBriefDto } from "../../../shared/types";

const pipelineAsyncEnabled = (): boolean =>
  (process.env.PIPELINE_ASYNC_INVOCATION === "1" ||
    process.env.PIPELINE_ASYNC_INVOCATION === "true") &&
  Boolean(process.env.PIPELINE_WORKER_FUNCTION_NAME?.trim());

const mergeSceneJsonInput = (
  jobPlan: JobPlanResult,
  jobBrief?: JobBriefDto,
): JobPlanResult => {
  return {
    ...jobPlan,
    creativeBrief: jobBrief?.creativeBrief ?? jobPlan.creativeBrief,
    presetId: jobBrief?.presetId ?? jobPlan.presetId,
    presetSnapshot: jobBrief?.presetSnapshot ?? jobPlan.presetSnapshot,
    resolvedPolicy: jobBrief?.resolvedPolicy ?? jobPlan.resolvedPolicy,
  };
};

export const runSceneJsonCore = async (jobId: string) => {
  const job = await getJobOrThrow(jobId);
  const planResolved = await resolveJobPlanS3KeyForSceneBuild(jobId, job);
  if (!planResolved) {
    throw new Error("job plan not found");
  }

  const jobPlan = await getJsonFromS3<JobPlanResult>(planResolved.jobPlanS3Key);
  if (!jobPlan) {
    throw new Error("job plan payload not found");
  }

  const jobBrief = job.jobBriefS3Key
    ? ((await getJsonFromS3<JobBriefDto>(job.jobBriefS3Key)) ?? undefined)
    : undefined;

  const sceneJsonInput = mergeSceneJsonInput(jobPlan, jobBrief);

  await updateJobMeta(jobId, {}, "SCENE_JSON_BUILDING");
  const sceneJson = await buildSceneJson(sceneJsonInput);
  const sceneJsonS3Key = getSceneJsonKey(jobId);
  await putJsonToS3(sceneJsonS3Key, sceneJson);
  await clearSceneAssets(jobId);
  await persistSceneAssets(jobId, sceneJson);
  await updateJobMeta(
    jobId,
    {
      sceneJsonS3Key,
      videoTitle: sceneJson.videoTitle,
    },
    "SCENE_JSON_READY",
  );

  const updated = await getJobOrThrow(jobId);
  return mapJobMetaToAdminJob(updated);
};

export const runAdminSceneJson = async (
  jobId: string,
  triggeredBy?: string,
) => {
  const job = await getJobOrThrow(jobId);
  const planResolved = await resolveJobPlanS3KeyForSceneBuild(jobId, job);
  if (!planResolved) {
    throw new Error("job plan not found");
  }
  const inputSnapshotId = planResolved.jobPlanS3Key;

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
