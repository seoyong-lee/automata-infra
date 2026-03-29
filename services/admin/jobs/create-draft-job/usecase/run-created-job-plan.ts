import { runAdminJobPlan } from "../../../generations/run-job-plan/usecase/run-job-plan";
import { mapJobMetaToAdminJob } from "../../../shared/mapper/map-job-meta-to-admin-job";
import { getJobOrThrow } from "../../../shared/repo/job-draft-store";

export const runCreatedJobPlan = async (
  jobId: string,
  triggeredBy?: string,
) => {
  try {
    return await runAdminJobPlan(jobId, triggeredBy);
  } catch {
    const failedJob = await getJobOrThrow(jobId);
    return mapJobMetaToAdminJob(failedJob);
  }
};
