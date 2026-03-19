import { createHash } from "crypto";
import { Handler } from "aws-lambda";
import { putJsonToS3 } from "../shared/lib/aws/runtime";
import { putJobMeta } from "../shared/lib/store/video-jobs";

type TopicPlanResult = {
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

const createTopicResult = (): TopicPlanResult => {
  const createdAt = new Date().toISOString();
  const jobId = `job_${createdAt.replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  const channelId = process.env.CHANNEL_ID ?? "history-en";
  const targetLanguage = process.env.DEFAULT_LANGUAGE ?? "en";
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

const buildTopicHash = (titleIdea: string): string => {
  return createHash("sha256").update(titleIdea).digest("hex").slice(0, 16);
};

const saveTopicArtifacts = async (result: TopicPlanResult): Promise<void> => {
  const topicHash = buildTopicHash(result.titleIdea);
  await putJsonToS3(result.topicS3Key, result);
  await putJobMeta({
    PK: `JOB#${result.jobId}`,
    SK: "META",
    jobId: result.jobId,
    channelId: result.channelId,
    topicId: result.topicId,
    topicHash,
    status: "PLANNED",
    language: result.targetLanguage,
    targetDurationSec: result.targetDurationSec,
    videoTitle: result.titleIdea,
    estimatedCost: 0,
    providerCosts: {},
    reviewMode: true,
    retryCount: 0,
    lastError: null,
    createdAt: result.createdAt,
    updatedAt: result.createdAt,
    GSI1PK: "STATUS#PLANNED",
    GSI1SK: result.createdAt,
    GSI2PK: `CHANNEL#${result.channelId}`,
    GSI2SK: `${result.createdAt}#JOB#${result.jobId}`,
    GSI3PK: `TOPIC#${topicHash}`,
    GSI3SK: `${result.createdAt}#JOB#${result.jobId}`,
  });
};

export const run: Handler<unknown, TopicPlanResult> = async () => {
  const result = createTopicResult();
  await saveTopicArtifacts(result);

  return result;
};
