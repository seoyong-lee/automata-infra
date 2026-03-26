import { runAdminJobPlan } from "../../../generations/run-job-plan/usecase/run-job-plan";
import { createDraftJob } from "../repo/create-draft-job";
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

  return runAdminJobPlan(created.jobId, input.triggeredBy);
};
