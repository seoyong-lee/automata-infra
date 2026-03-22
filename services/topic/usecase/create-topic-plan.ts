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
  contentId: string;
  contentType?: string;
  variant?: string;
  targetLanguage: string;
  targetDurationSec: number;
  titleIdea: string;
  stylePreset: string;
  /** 시드의 자유 서술 메모. Scene JSON 생성 시 프롬프트에 사용. */
  creativeBrief?: string;
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
  contentId?: string;
  targetLanguage?: string;
  contentType?: string;
  variant?: string;
  titleIdea?: string;
  targetDurationSec?: number;
  stylePreset?: string;
  creativeBrief?: string;
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
    contentId: deps.topicSeed?.contentId ?? configured.contentId,
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
  contentId: string;
  targetLanguage: string;
  contentType?: string;
  variant?: string;
  creativeBrief?: string;
}): Promise<TopicPlanSeed> => {
  const generated = await input.generateStructuredData({
    jobId: input.jobId,
    stepKey: "topic-plan",
    variables: {
      contentId: input.contentId,
      targetLanguage: input.targetLanguage,
      channelLabel: input.contentId,
      contentType: input.contentType ?? "",
      variant: input.variant ?? "",
      creativeBrief: input.creativeBrief ?? "",
    },
    validate: validateTopicPlanSeed,
    buildMockResult: buildMockTopicPlanSeed,
  });
  return generated.output;
};

const mergeCoalescedSeed = (
  seed: TopicPlanSeed,
  topicSeed?: TopicSeedOverrides,
): Pick<TopicPlanSeed, "targetDurationSec" | "titleIdea" | "stylePreset"> => {
  return {
    targetDurationSec: topicSeed?.targetDurationSec ?? seed.targetDurationSec,
    titleIdea: topicSeed?.titleIdea ?? seed.titleIdea,
    stylePreset: topicSeed?.stylePreset ?? seed.stylePreset,
  };
};

const topicSeedCreativeBrief = (
  topicSeed?: TopicSeedOverrides,
): string | undefined => {
  const trimmed = topicSeed?.creativeBrief?.trim();
  return trimmed ? trimmed : undefined;
};

const topicSeedOptionalMeta = (topicSeed?: TopicSeedOverrides) => {
  return {
    contentType: topicSeed?.contentType,
    variant: topicSeed?.variant,
    autoPublish: topicSeed?.autoPublish,
    publishAt: topicSeed?.publishAt,
  };
};

const buildTopicPlanResult = (input: {
  jobId: string;
  createdAt: string;
  contentId: string;
  targetLanguage: string;
  topicSeed?: TopicSeedOverrides;
  seed: TopicPlanSeed;
}): TopicPlanResult => {
  const merged = mergeCoalescedSeed(input.seed, input.topicSeed);
  const meta = topicSeedOptionalMeta(input.topicSeed);
  return {
    jobId: input.jobId,
    topicId: `topic_${input.jobId}`,
    contentId: input.contentId,
    targetLanguage: input.targetLanguage,
    ...merged,
    creativeBrief: topicSeedCreativeBrief(input.topicSeed),
    ...meta,
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
  const { contentId, targetLanguage } = resolveTopicContext(deps);
  const generateStructuredData =
    deps.generateStructuredData ?? generateStepStructuredData;
  const seed = hasCompleteSeed(deps.topicSeed)
    ? getSeedFromOverrides(deps.topicSeed)
    : await generateSeed({
        generateStructuredData,
        jobId,
        contentId,
        targetLanguage,
        contentType: deps.topicSeed?.contentType,
        variant: deps.topicSeed?.variant,
        creativeBrief: deps.topicSeed?.creativeBrief,
      });

  return buildTopicPlanResult({
    jobId,
    createdAt,
    contentId,
    targetLanguage,
    topicSeed: deps.topicSeed,
    seed,
  });
};
