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
};

export const createTopicPlan = async (
  deps: CreateTopicPlanDeps = {},
): Promise<TopicPlanResult> => {
  const createdAt = (deps.now ?? (() => new Date().toISOString()))();
  const jobId = `job_${createdAt.replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  const { channelId, targetLanguage } = (deps.loadConfig ?? loadTopicConfig)();
  const generateStructuredData =
    deps.generateStructuredData ?? generateStepStructuredData;
  const seed = await generateStructuredData({
    jobId,
    stepKey: "topic-plan",
    variables: {
      channelId,
      targetLanguage,
    },
    validate: validateTopicPlanSeed,
    buildMockResult: buildMockTopicPlanSeed,
  });

  return {
    jobId,
    topicId: `topic_${jobId}`,
    channelId,
    targetLanguage,
    targetDurationSec: seed.output.targetDurationSec,
    titleIdea: seed.output.titleIdea,
    stylePreset: seed.output.stylePreset,
    status: "PLANNED",
    topicS3Key: `topics/${jobId}/topic.json`,
    createdAt,
  };
};
