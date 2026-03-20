import { saveTopicSeed } from "../../shared/repo/job-draft-store";
import type { TopicSeedDto } from "../../shared/types";

export const updateAdminTopicSeed = async (input: {
  jobId: string;
  topicSeed: TopicSeedDto;
}): Promise<TopicSeedDto> => {
  await saveTopicSeed({
    jobId: input.jobId,
    topicSeed: input.topicSeed,
    status: "DRAFT",
  });
  return input.topicSeed;
};
