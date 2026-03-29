import { createDraftJob } from "../repo/create-draft-job";
import type { CreateDraftJobInputDto } from "../../../shared/types";
import { runCreatedJobPlan } from "./run-created-job-plan";

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

  return runCreatedJobPlan(created.jobId, input.triggeredBy);
};
