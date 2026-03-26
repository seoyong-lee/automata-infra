import { putJsonToS3 } from "../../../../shared/lib/aws/runtime";
import { invokePipelineWorkerAsync } from "../../../../shared/lib/aws/invoke-pipeline-worker";
import {
  startJobExecution,
  startQueuedJobExecution,
} from "../../../../shared/lib/store/job-execution";
import { updateJobMeta } from "../../../../shared/lib/store/video-jobs";
import { parseJobBriefInput } from "../../../../shared/lib/contracts/canonical-io-schemas";
import { createJobPlan } from "../../../../plan/usecase/create-job-plan";
import {
  getJobOrThrow,
  getStoredJobBrief,
} from "../../../shared/repo/job-draft-store";
import { mapJobMetaToAdminJob } from "../../../shared/mapper/map-job-meta-to-admin-job";

const pipelineAsyncEnabled = (): boolean =>
  (process.env.PIPELINE_ASYNC_INVOCATION === "1" ||
    process.env.PIPELINE_ASYNC_INVOCATION === "true") &&
  Boolean(process.env.PIPELINE_WORKER_FUNCTION_NAME?.trim());

export const runJobPlanCore = async (jobId: string) => {
  const job = await getJobOrThrow(jobId);
  const jobBrief = await getStoredJobBrief(job);
  if (!jobBrief) {
    throw new Error("job brief not found");
  }
  const validatedJobBrief = parseJobBriefInput(jobBrief);

  await updateJobMeta(jobId, {}, "PLANNING");
  const planned = await createJobPlan({
    jobId,
    jobBrief: validatedJobBrief,
  });
  await putJsonToS3(planned.jobPlanS3Key, planned);
  await updateJobMeta(
    jobId,
    {
      jobPlanS3Key: planned.jobPlanS3Key,
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

export const runAdminJobPlan = async (jobId: string, triggeredBy?: string) => {
  const job = await getJobOrThrow(jobId);
  const inputSnapshotId = job.jobBriefS3Key ?? undefined;

  if (pipelineAsyncEnabled()) {
    const { sk, finish } = await startQueuedJobExecution({
      jobId,
      stageType: "JOB_PLAN",
      triggeredBy,
      inputSnapshotId,
    });
    try {
      await invokePipelineWorkerAsync({
        jobId,
        executionSk: sk,
        stage: "JOB_PLAN",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await finish("FAILED", msg);
      throw e;
    }
    const queuedJob = await getJobOrThrow(jobId);
    return mapJobMetaToAdminJob(queuedJob);
  }

  const { finish } = await startJobExecution({
    jobId,
    stageType: "JOB_PLAN",
    triggeredBy,
    inputSnapshotId,
  });
  try {
    const result = await runJobPlanCore(jobId);
    await finish("SUCCEEDED", undefined, result.jobPlanS3Key);
    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await finish("FAILED", msg);
    throw e;
  }
};
