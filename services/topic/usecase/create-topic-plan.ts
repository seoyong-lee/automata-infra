import { loadTopicConfig } from "../normalize/load-topic-config";

export type TopicPlanResult = {
  jobId: string;
  topicId: string;
  channelId: string;
  targetLanguage: string;
  targetDurationSec: number;
  titleIdea: string;
  stylePreset: string;
  status: string;
  topicS3Key: string;
  createdAt: string;
};

export const createTopicPlan = (): TopicPlanResult => {
  const createdAt = new Date().toISOString();
  const jobId = `job_${createdAt.replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  const { channelId, targetLanguage } = loadTopicConfig();
  const titleIdea = "Why medieval Korea felt strangely quiet at night";

  return {
    jobId,
    topicId: `topic_${jobId}`,
    channelId,
    targetLanguage,
    targetDurationSec: 45,
    titleIdea,
    stylePreset: "dark_ambient_story",
    status: "PLANNED",
    topicS3Key: `topics/${jobId}/topic.json`,
    createdAt,
  };
};
