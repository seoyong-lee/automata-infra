import { createHash } from "crypto";
import { JobMetaItem } from "../../shared/lib/store/video-jobs";
import { TopicPlanResult } from "../usecase/create-topic-plan";

const buildTopicHash = (titleIdea: string): string => {
  return createHash("sha256").update(titleIdea).digest("hex").slice(0, 16);
};

export const mapTopicPlanJobMeta = (result: TopicPlanResult): JobMetaItem => {
  const topicHash = buildTopicHash(result.titleIdea);

  return {
    PK: `JOB#${result.jobId}`,
    SK: "META",
    jobId: result.jobId,
    channelId: result.channelId,
    contentType: result.contentType,
    variant: result.variant,
    topicId: result.topicId,
    topicHash,
    status: "PLANNED",
    autoPublish: result.autoPublish,
    publishAt: result.publishAt,
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
    GSI4PK: result.contentType ? `CONTENT#${result.contentType}` : undefined,
    GSI4SK: result.contentType
      ? `${result.createdAt}#JOB#${result.jobId}`
      : undefined,
  };
};
