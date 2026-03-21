import { createHash, randomUUID } from "crypto";
import { putJsonToS3 } from "../../../../shared/lib/aws/runtime";
import {
  ADMIN_UNASSIGNED_CONTENT_ID,
  parseContentBrief,
} from "../../../../shared/lib/contracts/canonical-io-schemas";
import {
  getContentMeta,
  gsi2PkForContentId,
  putJobMeta,
  type JobMetaItem,
} from "../../../../shared/lib/store/video-jobs";
import {
  buildContentBriefKey,
  buildTopicSeedKey,
} from "../../shared/repo/job-draft-store";
import { mapJobMetaToAdminJob } from "../../shared/mapper/map-job-meta-to-admin-job";
import type {
  ContentBriefDto,
  CreateDraftJobInputDto,
  TopicSeedDto,
} from "../../shared/types";
import { notFound } from "../../shared/errors";

const LEGACY_CONTENT_TYPE = "default";
const LEGACY_VARIANT = "default";

const buildTopicHash = (titleIdea: string): string => {
  return createHash("sha256").update(titleIdea).digest("hex").slice(0, 16);
};

const normalizeSlug = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "item";
};

/** 타임스탬프 조합 없이 UUID만 사용 (충돌 확률 무시 가능 수준). */
const buildJobId = (): string => {
  return `job_${randomUUID().replace(/-/g, "")}`;
};

const buildTopicSeed = (
  draft: CreateDraftJobInputDto,
  contentId: string,
): TopicSeedDto => {
  return {
    contentId,
    targetLanguage: draft.targetLanguage,
    titleIdea: draft.titleIdea,
    targetDurationSec: draft.targetDurationSec,
    stylePreset: draft.stylePreset,
    ...(draft.creativeBrief !== undefined && draft.creativeBrief !== ""
      ? { creativeBrief: draft.creativeBrief }
      : {}),
  };
};

const buildContentBrief = (input: {
  draft: CreateDraftJobInputDto;
  jobId: string;
  now: string;
  contentId: string;
  contentLabel: string;
}): ContentBriefDto => {
  const date = input.now.slice(0, 10);
  return parseContentBrief({
    jobId: input.jobId,
    contentType: LEGACY_CONTENT_TYPE,
    variant: LEGACY_VARIANT,
    contentId: input.contentId,
    language: input.draft.targetLanguage,
    targetPlatform: "youtube-shorts",
    targetDurationSec: input.draft.targetDurationSec,
    titleIdea: input.draft.titleIdea,
    stylePreset: input.draft.stylePreset,
    autoPublish: input.draft.autoPublish ?? false,
    publishAt: input.draft.publishAt,
    seed: {
      date,
      fortuneType: LEGACY_CONTENT_TYPE,
      audience: input.contentLabel,
      style: input.draft.stylePreset,
      tone: "default",
      topicKey: normalizeSlug(input.draft.titleIdea),
    },
    constraints: {
      maxScenes: 5,
      mustHaveHook: true,
      mustHaveCTA: true,
      safetyLevel: "default",
      noMedicalOrLegalClaims: true,
    },
  });
};

export const createDraftJob = async (input: {
  draft: CreateDraftJobInputDto;
  now: string;
}) => {
  const requested = input.draft.contentId;
  const useUnassigned =
    requested === undefined || requested === ADMIN_UNASSIGNED_CONTENT_ID;

  const parent = useUnassigned ? null : await getContentMeta(requested);
  if (!useUnassigned && !parent) {
    throw notFound("content not found");
  }

  const contentId = parent?.contentId ?? ADMIN_UNASSIGNED_CONTENT_ID;
  const contentLabel = parent?.label ?? "미연결";
  const jobId = buildJobId();
  const topicSeed = buildTopicSeed(input.draft, contentId);
  const contentBrief = buildContentBrief({
    draft: input.draft,
    jobId,
    now: input.now,
    contentId,
    contentLabel,
  });
  const topicSeedS3Key = buildTopicSeedKey(jobId);
  const contentBriefS3Key = buildContentBriefKey(jobId);
  await Promise.all([
    putJsonToS3(topicSeedS3Key, topicSeed),
    putJsonToS3(contentBriefS3Key, contentBrief),
  ]);
  const topicHash = buildTopicHash(topicSeed.titleIdea);

  const item: JobMetaItem = {
    PK: `JOB#${jobId}`,
    SK: "META",
    jobId,
    contentType: LEGACY_CONTENT_TYPE,
    variant: LEGACY_VARIANT,
    contentId,
    topicId: `topic_${jobId}`,
    topicHash,
    status: "DRAFT",
    autoPublish: input.draft.autoPublish ?? false,
    publishAt: input.draft.publishAt,
    language: topicSeed.targetLanguage,
    targetDurationSec: topicSeed.targetDurationSec,
    videoTitle: topicSeed.titleIdea,
    estimatedCost: 0,
    providerCosts: {},
    reviewMode: true,
    retryCount: 0,
    lastError: null,
    contentBriefS3Key,
    topicSeedS3Key,
    createdAt: input.now,
    updatedAt: input.now,
    GSI1PK: "STATUS#DRAFT",
    GSI1SK: input.now,
    GSI2PK: gsi2PkForContentId(contentId),
    GSI2SK: `${input.now}#JOB#${jobId}`,
    GSI3PK: `TOPIC#${topicHash}`,
    GSI3SK: `${input.now}#JOB#${jobId}`,
    GSI4PK: `CONTENT#${LEGACY_CONTENT_TYPE}`,
    GSI4SK: `${input.now}#JOB#${jobId}`,
    GSI5PK: `CONTENT#${contentId}`,
    GSI5SK: `${input.now}#JOB#${jobId}`,
  };

  await putJobMeta(item);
  return mapJobMetaToAdminJob(item);
};
