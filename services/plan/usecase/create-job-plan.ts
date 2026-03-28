import { loadPlanConfig } from "../normalize/load-plan-config";
import {
  generateStepStructuredData,
  type GenerateStructuredData,
} from "../../shared/lib/llm";
import type {
  PresetSnapshot,
  ResolvedPolicy,
} from "../../shared/lib/contracts/content-presets";
import {
  expectNumber,
  expectRecord,
  expectString,
} from "../../shared/lib/llm/validate";

export type JobPlanResult = {
  jobId: string;
  contentId: string;
  contentType?: string;
  variant?: string;
  presetId?: string;
  presetSnapshot?: PresetSnapshot;
  resolvedPolicy?: ResolvedPolicy;
  targetLanguage: string;
  targetDurationSec: number;
  titleIdea: string;
  stylePreset: string;
  /** 브리프의 자유 서술 메모. Scene JSON 생성 시 프롬프트에 사용. */
  creativeBrief?: string;
  autoPublish?: boolean;
  publishAt?: string;
  status: string;
  jobPlanS3Key: string;
  createdAt: string;
};

type JobPlanSeed = {
  titleIdea: string;
  targetDurationSec: number;
  stylePreset: string;
};

type JobBriefOverrides = {
  contentId?: string;
  targetLanguage?: string;
  contentType?: string;
  variant?: string;
  presetId?: string;
  presetSnapshot?: PresetSnapshot;
  resolvedPolicy?: ResolvedPolicy;
  titleIdea?: string;
  targetDurationSec?: number;
  stylePreset?: string;
  creativeBrief?: string;
  autoPublish?: boolean;
  publishAt?: string;
};

const validateJobPlanSeed = (payload: unknown): JobPlanSeed => {
  const root = expectRecord(payload, "jobPlan");

  return {
    titleIdea: expectString(root.titleIdea, "jobPlan.titleIdea"),
    targetDurationSec: expectNumber(
      root.targetDurationSec,
      "jobPlan.targetDurationSec",
    ),
    stylePreset: expectString(root.stylePreset, "jobPlan.stylePreset"),
  };
};

const buildMockJobPlanSeed = (): JobPlanSeed => {
  return {
    titleIdea: "Why medieval Korea felt strangely quiet at night",
    targetDurationSec: 45,
    stylePreset: "dark_ambient_story",
  };
};

type CreateJobPlanDeps = {
  now?: () => string;
  generateStructuredData?: GenerateStructuredData;
  loadConfig?: typeof loadPlanConfig;
  jobId?: string;
  jobBrief?: JobBriefOverrides;
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
  jobBrief?: JobBriefOverrides,
): string => {
  if (jobId) {
    return jobId;
  }
  if (jobBrief?.contentType && jobBrief.variant) {
    return `job_${createdAt.slice(0, 10).replace(/-/g, "")}_${normalizeSlug(jobBrief.contentType)}_${normalizeSlug(jobBrief.variant)}`;
  }
  return `job_${createdAt.replace(/[-:.TZ]/g, "").slice(0, 14)}`;
};

const resolvePlanContext = (deps: CreateJobPlanDeps) => {
  const configured = (deps.loadConfig ?? loadPlanConfig)();
  return {
    contentId: deps.jobBrief?.contentId ?? configured.contentId,
    targetLanguage: deps.jobBrief?.targetLanguage ?? configured.targetLanguage,
  };
};

const hasCompleteBrief = (
  brief?: JobBriefOverrides,
): brief is Required<JobPlanSeed> => {
  return (
    typeof brief?.titleIdea === "string" &&
    typeof brief.targetDurationSec === "number" &&
    typeof brief.stylePreset === "string"
  );
};

const getSeedFromOverrides = (seed: Required<JobPlanSeed>): JobPlanSeed => {
  return {
    titleIdea: seed.titleIdea,
    targetDurationSec: seed.targetDurationSec,
    stylePreset: seed.stylePreset,
  };
};

const buildPresetPromptVariables = (
  resolvedPolicy?: ResolvedPolicy,
): Record<string, string> => {
  if (!resolvedPolicy) {
    return {};
  }

  return {
    presetFormat: resolvedPolicy.format,
    styleTags: resolvedPolicy.styleTags.join(", "),
    voiceMode: resolvedPolicy.capabilities.voiceMode,
    subtitleMode: resolvedPolicy.capabilities.subtitleMode,
    layoutMode: resolvedPolicy.capabilities.layoutMode,
    assetStrategy: resolvedPolicy.assetStrategy,
  };
};

const generateSeed = async (input: {
  generateStructuredData: GenerateStructuredData;
  jobId: string;
  contentId: string;
  targetLanguage: string;
  contentType?: string;
  variant?: string;
  presetId?: string;
  resolvedPolicy?: ResolvedPolicy;
  creativeBrief?: string;
}): Promise<JobPlanSeed> => {
  const presetVariables = buildPresetPromptVariables(input.resolvedPolicy);
  const generated = await input.generateStructuredData({
    jobId: input.jobId,
    stepKey: "job-plan",
    variables: {
      contentId: input.contentId,
      targetLanguage: input.targetLanguage,
      channelLabel: input.contentId,
      contentType: input.contentType ?? "",
      variant: input.variant ?? "",
      ...(input.presetId ? { presetId: input.presetId } : {}),
      ...presetVariables,
      creativeBrief: input.creativeBrief ?? "",
    },
    validate: validateJobPlanSeed,
    buildMockResult: buildMockJobPlanSeed,
  });
  return generated.output;
};

const mergeCoalescedSeed = (
  seed: JobPlanSeed,
  jobBrief?: JobBriefOverrides,
): Pick<JobPlanSeed, "targetDurationSec" | "titleIdea" | "stylePreset"> => {
  return {
    targetDurationSec: jobBrief?.targetDurationSec ?? seed.targetDurationSec,
    titleIdea: jobBrief?.titleIdea ?? seed.titleIdea,
    stylePreset: jobBrief?.stylePreset ?? seed.stylePreset,
  };
};

const jobBriefCreativeBrief = (
  jobBrief?: JobBriefOverrides,
): string | undefined => {
  const trimmed = jobBrief?.creativeBrief?.trim();
  return trimmed ? trimmed : undefined;
};

const jobBriefOptionalMeta = (jobBrief?: JobBriefOverrides) => {
  return {
    contentType: jobBrief?.contentType,
    variant: jobBrief?.variant,
    ...(jobBrief?.presetId ? { presetId: jobBrief.presetId } : {}),
    ...(jobBrief?.presetSnapshot
      ? { presetSnapshot: jobBrief.presetSnapshot }
      : {}),
    ...(jobBrief?.resolvedPolicy
      ? { resolvedPolicy: jobBrief.resolvedPolicy }
      : {}),
    autoPublish: jobBrief?.autoPublish,
    publishAt: jobBrief?.publishAt,
  };
};

const buildJobPlanResult = (input: {
  jobId: string;
  createdAt: string;
  contentId: string;
  targetLanguage: string;
  jobBrief?: JobBriefOverrides;
  seed: JobPlanSeed;
}): JobPlanResult => {
  const merged = mergeCoalescedSeed(input.seed, input.jobBrief);
  const meta = jobBriefOptionalMeta(input.jobBrief);
  return {
    jobId: input.jobId,
    contentId: input.contentId,
    targetLanguage: input.targetLanguage,
    ...merged,
    creativeBrief: jobBriefCreativeBrief(input.jobBrief),
    ...meta,
    status: "PLANNED",
    jobPlanS3Key: `plans/${input.jobId}/job-plan.json`,
    createdAt: input.createdAt,
  };
};

export const createJobPlan = async (
  deps: CreateJobPlanDeps = {},
): Promise<JobPlanResult> => {
  const createdAt = (deps.now ?? (() => new Date().toISOString()))();
  const jobId = resolveJobId(createdAt, deps.jobId, deps.jobBrief);
  const { contentId, targetLanguage } = resolvePlanContext(deps);
  const generateStructuredData =
    deps.generateStructuredData ?? generateStepStructuredData;
  const seed = hasCompleteBrief(deps.jobBrief)
    ? getSeedFromOverrides(deps.jobBrief)
    : await generateSeed({
        generateStructuredData,
        jobId,
        contentId,
        targetLanguage,
        contentType: deps.jobBrief?.contentType,
        variant: deps.jobBrief?.variant,
        presetId: deps.jobBrief?.presetId,
        resolvedPolicy: deps.jobBrief?.resolvedPolicy,
        creativeBrief: deps.jobBrief?.creativeBrief,
      });

  return buildJobPlanResult({
    jobId,
    createdAt,
    contentId,
    targetLanguage,
    jobBrief: deps.jobBrief,
    seed,
  });
};
