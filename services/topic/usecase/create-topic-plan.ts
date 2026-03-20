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
  targetLanguage: string;
  targetDurationSec: number;
  titleIdea: string;
  stylePreset: string;
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
  titleIdea?: string;
  targetDurationSec?: number;
  stylePreset?: string;
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

const resolveJobId = (createdAt: string, jobId?: string): string => {
  return jobId ?? `job_${createdAt.replace(/[-:.TZ]/g, "").slice(0, 14)}`;
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

export const createTopicPlan = async (
  deps: CreateTopicPlanDeps = {},
): Promise<TopicPlanResult> => {
  const createdAt = (deps.now ?? (() => new Date().toISOString()))();
  const jobId = resolveJobId(createdAt, deps.jobId);
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

  return {
    jobId,
    topicId: `topic_${jobId}`,
    channelId,
    targetLanguage,
    targetDurationSec:
      deps.topicSeed?.targetDurationSec ?? seed.targetDurationSec,
    titleIdea: deps.topicSeed?.titleIdea ?? seed.titleIdea,
    stylePreset: deps.topicSeed?.stylePreset ?? seed.stylePreset,
    status: "PLANNED",
    topicS3Key: `topics/${jobId}/topic.json`,
    createdAt,
  };
};
