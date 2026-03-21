import { putJsonToS3 } from "../../../../shared/lib/aws/runtime";
import { invokePipelineWorkerAsync } from "../../../../shared/lib/aws/invoke-pipeline-worker";
import {
  startJobExecution,
  startQueuedJobExecution,
} from "../../../../shared/lib/store/job-execution";
import { updateJobMeta } from "../../../../shared/lib/store/video-jobs";
import { parseTopicSeedInput } from "../../../../shared/lib/contracts/canonical-io-schemas";
import { createTopicPlan } from "../../../../topic/usecase/create-topic-plan";
import {
  getJobOrThrow,
  getStoredTopicSeed,
} from "../../shared/repo/job-draft-store";
import { mapJobMetaToAdminJob } from "../../shared/mapper/map-job-meta-to-admin-job";

const pipelineAsyncEnabled = (): boolean =>
  (process.env.PIPELINE_ASYNC_INVOCATION === "1" ||
    process.env.PIPELINE_ASYNC_INVOCATION === "true") &&
  Boolean(process.env.PIPELINE_WORKER_FUNCTION_NAME?.trim());

export const runTopicPlanCore = async (jobId: string) => {
  const job = await getJobOrThrow(jobId);
  const topicSeed = await getStoredTopicSeed(job);
  if (!topicSeed) {
    throw new Error("topic seed not found");
  }
  const validatedTopicSeed = parseTopicSeedInput(topicSeed);

  await updateJobMeta(jobId, {}, "PLANNING");
  const planned = await createTopicPlan({
    jobId,
    topicSeed: validatedTopicSeed,
  });
  await putJsonToS3(planned.topicS3Key, planned);
  await updateJobMeta(
    jobId,
    {
      topicS3Key: planned.topicS3Key,
      contentId: planned.contentId,
      language: planned.targetLanguage,
      targetDurationSec: planned.targetDurationSec,
      videoTitle: planned.titleIdea,
    },
    "PLANNED",
  );

  const updated = await getJobOrThrow(jobId);
  return mapJobMetaToAdminJob(updated);
};

export const runAdminTopicPlan = async (
  jobId: string,
  triggeredBy?: string,
) => {
  if (pipelineAsyncEnabled()) {
    const { sk, finish } = await startQueuedJobExecution({
      jobId,
      stageType: "TOPIC_PLAN",
      triggeredBy,
    });
    try {
      await invokePipelineWorkerAsync({
        jobId,
        executionSk: sk,
        stage: "TOPIC_PLAN",
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
    stageType: "TOPIC_PLAN",
    triggeredBy,
  });
  try {
    const result = await runTopicPlanCore(jobId);
    await finish("SUCCEEDED");
    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await finish("FAILED", msg);
    throw e;
  }
};
