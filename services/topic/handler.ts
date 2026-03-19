import { Handler } from "aws-lambda";

type TopicPlanResult = {
  jobId: string;
  topicId: string;
  channelId: string;
  targetLanguage: string;
  targetDurationSec: number;
  titleIdea: string;
  stylePreset: string;
  status: string;
};

export const handler: Handler<unknown, TopicPlanResult> = async () => {
  const createdAt = new Date().toISOString();
  const jobId = `job_${createdAt.replace(/[-:.TZ]/g, "").slice(0, 14)}`;

  return {
    jobId,
    topicId: `topic_${jobId}`,
    channelId: process.env.CHANNEL_ID ?? "history-en",
    targetLanguage: process.env.DEFAULT_LANGUAGE ?? "en",
    targetDurationSec: 45,
    titleIdea: "Why medieval Korea felt strangely quiet at night",
    stylePreset: "dark_ambient_story",
    status: "PLANNED",
  };
};
