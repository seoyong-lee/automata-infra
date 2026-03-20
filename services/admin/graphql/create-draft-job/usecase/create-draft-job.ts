import { createDraftJob } from "../repo/create-draft-job";
import type { CreateDraftJobInputDto } from "../../shared/types";

export const createAdminDraftJob = async (input: {
  draft: CreateDraftJobInputDto;
}) => {
  return createDraftJob({
    draft: input.draft,
    now: new Date().toISOString(),
  });
};
