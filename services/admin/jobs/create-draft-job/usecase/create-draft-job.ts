import { runAdminJobPlan } from "../../../generations/run-job-plan/usecase/run-job-plan";
import { createDraftJob } from "../repo/create-draft-job";
import { mapJobMetaToAdminJob } from "../../../shared/mapper/map-job-meta-to-admin-job";
import { getJobOrThrow } from "../../../shared/repo/job-draft-store";
import type { CreateDraftJobInputDto } from "../../../shared/types";

export const createAdminDraftJob = async (input: {
  draft: CreateDraftJobInputDto;
  triggeredBy?: string;
}) => {
  const created = await createDraftJob({
    draft: input.draft,
    now: new Date().toISOString(),
  });

  const shouldRunJobPlan = input.draft.runJobPlan !== false;
  if (!shouldRunJobPlan) {
    return created;
  }

  try {
    return await runAdminJobPlan(created.jobId, input.triggeredBy);
  } catch {
    const failedJob = await getJobOrThrow(created.jobId);
    return mapJobMetaToAdminJob(failedJob);
  }
};
