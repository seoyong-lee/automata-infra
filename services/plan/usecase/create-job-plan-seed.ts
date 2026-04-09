import {
  generateStepStructuredData,
  type GenerateStructuredData,
} from "../../shared/lib/llm";
import { softenMarkdownFencesForPrompt } from "../../shared/lib/llm/soften-markdown-fences-for-prompt";
import type { ResolvedPolicy } from "../../shared/lib/contracts/content-presets";
import {
  expectNumber,
  expectRecord,
  expectString,
} from "../../shared/lib/llm/validate";
import type {
  ContentPresetPromptOverride,
  JobBriefOverrides,
  JobPlanSeed,
} from "./create-job-plan-types";

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

export const hasCompleteBrief = (
  brief?: JobBriefOverrides,
): brief is Required<JobPlanSeed> => {
  return (
    typeof brief?.titleIdea === "string" &&
    typeof brief.targetDurationSec === "number" &&
    typeof brief.stylePreset === "string"
  );
};

export const getSeedFromOverrides = (
  seed: Required<JobPlanSeed>,
): JobPlanSeed => {
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

const resolveJobPlanPromptOverride = (
  resolvedPolicy?: ResolvedPolicy,
): ContentPresetPromptOverride | undefined => {
  return resolvedPolicy?.promptOverrides?.jobPlan;
};

export const generateJobPlanSeed = async (input: {
  generateStructuredData?: GenerateStructuredData;
  jobId: string;
  contentId: string;
  targetLanguage: string;
  contentType?: string;
  variant?: string;
  presetId?: string;
  resolvedPolicy?: ResolvedPolicy;
  creativeBrief?: string;
}): Promise<JobPlanSeed> => {
  const generateStructuredData =
    input.generateStructuredData ?? generateStepStructuredData;
  const presetVariables = buildPresetPromptVariables(input.resolvedPolicy);
  const promptTemplateOverride = resolveJobPlanPromptOverride(
    input.resolvedPolicy,
  );
  const generated = await generateStructuredData({
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
      creativeBrief: softenMarkdownFencesForPrompt(input.creativeBrief ?? ""),
    },
    ...(promptTemplateOverride ? { promptTemplateOverride } : {}),
    validate: validateJobPlanSeed,
    buildMockResult: buildMockJobPlanSeed,
  });
  return generated.output;
};
