import { createDraftJob } from "../repo/create-draft-job";
import type { TopicSeedDto } from "../../shared/types";

export const createAdminDraftJob = async (input: {
  topicSeed: TopicSeedDto;
}) => {
  return createDraftJob({
    topicSeed: input.topicSeed,
    now: new Date().toISOString(),
  });
};
