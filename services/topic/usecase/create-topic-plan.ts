import { loadTopicConfig } from "../normalize/load-topic-config";
import {
  generateStepStructuredData,
  type GenerateStructuredData,
} from "../../shared/lib/llm";
import {
  expectNumber,
  expectRecord,
  expectString,
} from "../../shared/lib/llm/validate";

export type TopicPlanResult = {
  jobId: string;
  topicId: string;
  channelId: string;
  contentType?: string;
  variant?: string;
  targetLanguage: string;
  targetDurationSec: number;
  titleIdea: string;
  stylePreset: string;
  autoPublish?: boolean;
  publishAt?: string;
  status: string;
  topicS3Key: string;
  createdAt: string;
};

type TopicPlanSeed = {
  titleIdea: string;
  targetDurationSec: number;
  stylePreset: string;
};

type TopicSeedOverrides = {
  channelId?: string;
  targetLanguage?: string;
  contentType?: string;
  variant?: string;
  titleIdea?: string;
  targetDurationSec?: number;
  stylePreset?: string;
  autoPublish?: boolean;
  publishAt?: string;
};

const validateTopicPlanSeed = (payload: unknown): TopicPlanSeed => {
  const root = expectRecord(payload, "topicPlan");

  return {
    titleIdea: expectString(root.titleIdea, "topicPlan.titleIdea"),
    targetDurationSec: expectNumber(
      root.targetDurationSec,
      "topicPlan.targetDurationSec",
    ),
    stylePreset: expectString(root.stylePreset, "topicPlan.stylePreset"),
  };
};

const buildMockTopicPlanSeed = (): TopicPlanSeed => {
  return {
    titleIdea: "Why medieval Korea felt strangely quiet at night",
    targetDurationSec: 45,
    stylePreset: "dark_ambient_story",
  };
};

type CreateTopicPlanDeps = {
  now?: () => string;
  generateStructuredData?: GenerateStructuredData;
  loadConfig?: typeof loadTopicConfig;
  jobId?: string;
  topicSeed?: TopicSeedOverrides;
};

const normalizeSlug = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "item";
};

const resolveJobId = (
  createdAt: string,
  jobId?: string,
  topicSeed?: TopicSeedOverrides,
): string => {
  if (jobId) {
    return jobId;
  }
  if (topicSeed?.contentType && topicSeed.variant) {
    return `job_${createdAt.slice(0, 10).replace(/-/g, "")}_${normalizeSlug(topicSeed.contentType)}_${normalizeSlug(topicSeed.variant)}`;
  }
  return `job_${createdAt.replace(/[-:.TZ]/g, "").slice(0, 14)}`;
};

const resolveTopicContext = (deps: CreateTopicPlanDeps) => {
  const configured = (deps.loadConfig ?? loadTopicConfig)();
  return {
    channelId: deps.topicSeed?.channelId ?? configured.channelId,
    targetLanguage: deps.topicSeed?.targetLanguage ?? configured.targetLanguage,
  };
};

const hasCompleteSeed = (
  seed?: TopicSeedOverrides,
): seed is Required<TopicPlanSeed> => {
  return (
    typeof seed?.titleIdea === "string" &&
    typeof seed.targetDurationSec === "number" &&
    typeof seed.stylePreset === "string"
  );
};

const getSeedFromOverrides = (seed: Required<TopicPlanSeed>): TopicPlanSeed => {
  return {
    titleIdea: seed.titleIdea,
    targetDurationSec: seed.targetDurationSec,
    stylePreset: seed.stylePreset,
  };
};

const generateSeed = async (input: {
  generateStructuredData: GenerateStructuredData;
  jobId: string;
  channelId: string;
  targetLanguage: string;
}): Promise<TopicPlanSeed> => {
  const generated = await input.generateStructuredData({
    jobId: input.jobId,
    stepKey: "topic-plan",
    variables: {
      channelId: input.channelId,
      targetLanguage: input.targetLanguage,
    },
    validate: validateTopicPlanSeed,
    buildMockResult: buildMockTopicPlanSeed,
  });
  return generated.output;
};

const buildTopicPlanResult = (input: {
  jobId: string;
  createdAt: string;
  channelId: string;
  targetLanguage: string;
  topicSeed?: TopicSeedOverrides;
  seed: TopicPlanSeed;
}): TopicPlanResult => {
  return {
    jobId: input.jobId,
    topicId: `topic_${input.jobId}`,
    channelId: input.channelId,
    contentType: input.topicSeed?.contentType,
    variant: input.topicSeed?.variant,
    targetLanguage: input.targetLanguage,
    targetDurationSec:
      input.topicSeed?.targetDurationSec ?? input.seed.targetDurationSec,
    titleIdea: input.topicSeed?.titleIdea ?? input.seed.titleIdea,
    stylePreset: input.topicSeed?.stylePreset ?? input.seed.stylePreset,
    autoPublish: input.topicSeed?.autoPublish,
    publishAt: input.topicSeed?.publishAt,
    status: "PLANNED",
    topicS3Key: `topics/${input.jobId}/topic.json`,
    createdAt: input.createdAt,
  };
};

export const createTopicPlan = async (
  deps: CreateTopicPlanDeps = {},
): Promise<TopicPlanResult> => {
  const createdAt = (deps.now ?? (() => new Date().toISOString()))();
  const jobId = resolveJobId(createdAt, deps.jobId, deps.topicSeed);
  const { channelId, targetLanguage } = resolveTopicContext(deps);
  const generateStructuredData =
    deps.generateStructuredData ?? generateStepStructuredData;
  const seed = hasCompleteSeed(deps.topicSeed)
    ? getSeedFromOverrides(deps.topicSeed)
    : await generateSeed({
        generateStructuredData,
        jobId,
        channelId,
        targetLanguage,
      });

  return buildTopicPlanResult({
    jobId,
    createdAt,
    channelId,
    targetLanguage,
    topicSeed: deps.topicSeed,
    seed,
  });
};
