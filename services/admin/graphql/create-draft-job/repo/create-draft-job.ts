import { createHash } from "crypto";
import { putJsonToS3 } from "../../../../shared/lib/aws/runtime";
import {
  putJobMeta,
  JobMetaItem,
} from "../../../../shared/lib/store/video-jobs";
import { buildTopicSeedKey } from "../../shared/repo/job-draft-store";
import { mapJobMetaToAdminJob } from "../../shared/mapper/map-job-meta-to-admin-job";
import type { TopicSeedDto } from "../../shared/types";

const buildTopicHash = (titleIdea: string): string => {
  return createHash("sha256").update(titleIdea).digest("hex").slice(0, 16);
};

const buildJobId = (nowIso: string): string => {
  return `job_${nowIso.replace(/[-:.TZ]/g, "").slice(0, 14)}`;
};

export const createDraftJob = async (input: {
  topicSeed: TopicSeedDto;
  now: string;
}) => {
  const jobId = buildJobId(input.now);
  const topicSeedS3Key = buildTopicSeedKey(jobId);
  await putJsonToS3(topicSeedS3Key, input.topicSeed);
  const topicHash = buildTopicHash(input.topicSeed.titleIdea);

  const item: JobMetaItem = {
    PK: `JOB#${jobId}`,
    SK: "META",
    jobId,
    channelId: input.topicSeed.channelId,
    topicId: `topic_${jobId}`,
    topicHash,
    status: "DRAFT",
    language: input.topicSeed.targetLanguage,
    targetDurationSec: input.topicSeed.targetDurationSec,
    videoTitle: input.topicSeed.titleIdea,
    estimatedCost: 0,
    providerCosts: {},
    reviewMode: true,
    retryCount: 0,
    lastError: null,
    topicSeedS3Key,
    createdAt: input.now,
    updatedAt: input.now,
    GSI1PK: "STATUS#DRAFT",
    GSI1SK: input.now,
    GSI2PK: `CHANNEL#${input.topicSeed.channelId}`,
    GSI2SK: `${input.now}#JOB#${jobId}`,
    GSI3PK: `TOPIC#${topicHash}`,
    GSI3SK: `${input.now}#JOB#${jobId}`,
  };

  await putJobMeta(item);
  return mapJobMetaToAdminJob(item);
};
