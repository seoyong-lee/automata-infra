import {
  generateStepStructuredData,
  type GenerateStructuredData,
} from "../../shared/lib/llm";
import { softenMarkdownFencesForPrompt } from "../../shared/lib/llm/soften-markdown-fences-for-prompt";
import { parseSceneJsonInput } from "../../shared/lib/contracts/canonical-io-schemas";
import type {
  ContentPresetPromptOverride,
  PresetSnapshot,
  ResolvedPolicy,
} from "../../shared/lib/contracts/content-presets";
import { SceneJson } from "../../../types/render/scene-json";

type JobPlanResult = {
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
  creativeBrief?: string;
  autoPublish?: boolean;
  publishAt?: string;
};

export type SceneJsonResult = JobPlanResult & {
  status: string;
  sceneJsonS3Key: string;
  sceneJson: SceneJson;
};

const buildMockSceneJson = (event: JobPlanResult): SceneJson => {
  return {
    videoTitle: event.titleIdea,
    language: event.targetLanguage,
    scenes: [
      {
        sceneId: 1,
        durationSec: 8,
        narration: "At night, the fortress did not sleep. It listened.",
        imagePrompt:
          "moonlit Korean fortress, quiet courtyard, cinematic, mist",
        videoPrompt:
          "slow cinematic push-in, moonlit Korean fortress courtyard, mist",
        subtitle: "At night, the fortress did not sleep. It listened.",
        bgmMood: "dark_ambient",
      },
      {
        sceneId: 2,
        durationSec: 8,
        narration: "Every footstep carried farther in the cold air.",
        imagePrompt:
          "ancient Korean stone path at night, fog, moonlight, cinematic",
        videoPrompt: "slow dolly across moonlit Korean stone path, subtle mist",
        subtitle: "Every footstep carried farther in the cold air.",
        bgmMood: "dark_ambient",
      },
    ],
  };
};

const validateSceneJson = (payload: unknown): SceneJson => {
  return parseSceneJsonInput(payload);
};

type BuildSceneJsonDeps = {
  generateStructuredData?: GenerateStructuredData;
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

const resolveSceneJsonPromptOverride = (
  resolvedPolicy?: ResolvedPolicy,
): ContentPresetPromptOverride | undefined => {
  return resolvedPolicy?.promptOverrides?.sceneJson;
};

export const buildSceneJson = async (
  event: JobPlanResult,
  deps: BuildSceneJsonDeps = {},
  options?: { sourceVideoFrameContextAppend?: string },
): Promise<SceneJson> => {
  const generateStructuredData =
    deps.generateStructuredData ?? generateStepStructuredData;
  const presetVariables = buildPresetPromptVariables(event.resolvedPolicy);
  const promptTemplateOverride = resolveSceneJsonPromptOverride(
    event.resolvedPolicy,
  );

  const baseBrief = softenMarkdownFencesForPrompt(event.creativeBrief ?? "");
  const append = options?.sourceVideoFrameContextAppend?.trim();
  const creativeBrief =
    append && append.length > 0
      ? `${baseBrief}\n\n---\nSource video frame extraction (for scene authoring)\n---\n${append}`
      : baseBrief;

  const result = await generateStructuredData({
    jobId: event.jobId,
    stepKey: "scene-json",
    variables: {
      titleIdea: event.titleIdea,
      targetLanguage: event.targetLanguage,
      targetDurationSec: event.targetDurationSec,
      stylePreset: event.stylePreset,
      ...(event.presetId ? { presetId: event.presetId } : {}),
      ...presetVariables,
      creativeBrief,
    },
    ...(promptTemplateOverride ? { promptTemplateOverride } : {}),
    validate: validateSceneJson,
    buildMockResult: () => buildMockSceneJson(event),
  });

  return result.output;
};
