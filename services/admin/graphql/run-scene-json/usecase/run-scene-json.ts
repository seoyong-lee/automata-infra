import { getJsonFromS3, putJsonToS3 } from "../../../../shared/lib/aws/runtime";
import { invokePipelineWorkerAsync } from "../../../../shared/lib/aws/invoke-pipeline-worker";
import {
  startJobExecution,
  startQueuedJobExecution,
} from "../../../../shared/lib/store/job-execution";
import { getJobOrThrow } from "../../shared/repo/job-draft-store";
import { mapJobMetaToAdminJob } from "../../shared/mapper/map-job-meta-to-admin-job";
import { updateJobMeta } from "../../../../shared/lib/store/video-jobs";
import { buildSceneJson } from "../../../../script/usecase/build-scene-json";
import type { TopicPlanResult } from "../../../../topic/usecase/create-topic-plan";
import { getSceneJsonKey } from "../../../../script/normalize/get-scene-json-key";
import { persistSceneAssets } from "../../../../script/repo/persist-scene-assets";
import type { TopicSeedDto } from "../../shared/types";

const pipelineAsyncEnabled = (): boolean =>
  (process.env.PIPELINE_ASYNC_INVOCATION === "1" ||
    process.env.PIPELINE_ASYNC_INVOCATION === "true") &&
  Boolean(process.env.PIPELINE_WORKER_FUNCTION_NAME?.trim());

export const runSceneJsonCore = async (jobId: string) => {
  const job = await getJobOrThrow(jobId);
  if (!job.topicS3Key) {
    throw new Error("topic plan not found");
  }

  const topicPlan = await getJsonFromS3<TopicPlanResult>(job.topicS3Key);
  if (!topicPlan) {
    throw new Error("topic plan payload not found");
  }

  const topicSeed = job.topicSeedS3Key
    ? ((await getJsonFromS3<TopicSeedDto>(job.topicSeedS3Key)) ?? undefined)
    : undefined;

  const sceneJsonInput: TopicPlanResult = {
    ...topicPlan,
    creativeBrief: topicSeed?.creativeBrief ?? topicPlan.creativeBrief,
  };

  await updateJobMeta(jobId, {}, "SCENE_JSON_BUILDING");
  const sceneJson = await buildSceneJson(sceneJsonInput);
  const sceneJsonS3Key = getSceneJsonKey(jobId);
  await putJsonToS3(sceneJsonS3Key, sceneJson);
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
  if (pipelineAsyncEnabled()) {
    const { sk, finish } = await startQueuedJobExecution({
      jobId,
      stageType: "SCENE_JSON",
      triggeredBy,
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
  });
  try {
    const result = await runSceneJsonCore(jobId);
    await finish("SUCCEEDED");
    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await finish("FAILED", msg);
    throw e;
  }
};
