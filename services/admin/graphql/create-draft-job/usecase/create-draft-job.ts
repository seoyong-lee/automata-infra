import { runAdminTopicPlan } from "../../run-topic-plan/usecase/run-topic-plan";
import { createDraftJob } from "../repo/create-draft-job";
import type { CreateDraftJobInputDto } from "../../shared/types";

export const createAdminDraftJob = async (input: {
  draft: CreateDraftJobInputDto;
  triggeredBy?: string;
}) => {
  const created = await createDraftJob({
    draft: input.draft,
    now: new Date().toISOString(),
  });

  const shouldRunTopicPlan = input.draft.runTopicPlan !== false;
  if (!shouldRunTopicPlan) {
    return created;
  }

  return runAdminTopicPlan(created.jobId, input.triggeredBy);
};
