import { putJsonToS3 } from "../../../../shared/lib/aws/runtime";
import { updateJobMeta } from "../../../../shared/lib/store/video-jobs";
import { parseJobBriefInput } from "../../../../shared/lib/contracts/canonical-io-schemas";
import { createJobPlan } from "../../../../plan/usecase/create-job-plan";
import {
  getJobOrThrow,
  getStoredJobBrief,
} from "../../../shared/repo/job-draft-store";
import { mapJobMetaToAdminJob } from "../../../shared/mapper/map-job-meta-to-admin-job";
import { runAdminStageExecution } from "../../../shared/usecase/run-admin-stage-execution";

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
      lastError: null,
    },
    "PLANNED",
  );

  const updated = await getJobOrThrow(jobId);
  return mapJobMetaToAdminJob(updated);
};

export const runAdminJobPlan = async (jobId: string, triggeredBy?: string) => {
  const job = await getJobOrThrow(jobId);
  const inputSnapshotId = job.jobBriefS3Key ?? undefined;
  return runAdminStageExecution({
    jobId,
    stageType: "JOB_PLAN",
    triggeredBy,
    inputSnapshotId,
    runCore: () => runJobPlanCore(jobId),
    getQueuedResult: async () =>
      mapJobMetaToAdminJob(await getJobOrThrow(jobId)),
    getSuccessSnapshot: (result) => result.jobPlanS3Key,
    onAsyncInvokeError: async (message) => {
      await updateJobMeta(jobId, { lastError: message }, "FAILED");
    },
    onSyncError: async (message) => {
      await updateJobMeta(jobId, { lastError: message }, "FAILED");
    },
  });
};
