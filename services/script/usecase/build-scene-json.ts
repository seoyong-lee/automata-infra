import {
  generateStepStructuredData,
  type GenerateStructuredData,
} from "../../shared/lib/llm";
import { sceneStartTransitionSchema } from "../../shared/lib/contracts/canonical-io-schemas";
import type {
  ContentPresetPromptOverride,
  PresetSnapshot,
  ResolvedPolicy,
} from "../../shared/lib/contracts/content-presets";
import {
  expectArray,
  expectNullableString,
  expectNumberCoerced,
  expectOptionalBoolean,
  expectOptionalString,
  expectRecord,
  expectString,
} from "../../shared/lib/llm/validate";
import { alignSceneJsonNarrationAndSubtitle } from "../../shared/lib/scene-text";
import { applyDefaultSceneStartTransitions } from "../../shared/lib/scene-transition-defaults";
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

const parseOptionalStartTransition = (
  value: unknown,
  label: string,
) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const parsed = sceneStartTransitionSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(`${label} is invalid`);
  }
  return parsed.data;
};

const validateSceneJson = (payload: unknown): SceneJson => {
  const root = expectRecord(payload, "sceneJson");

  return {
    videoTitle: expectString(root.videoTitle, "sceneJson.videoTitle"),
    language: expectString(root.language, "sceneJson.language"),
    scenes: expectArray(root.scenes, "sceneJson.scenes", (scene, index) => {
      const record = expectRecord(scene, `sceneJson.scenes[${index}]`);

      return {
        sceneId: expectNumberCoerced(
          record.sceneId,
          `sceneJson.scenes[${index}].sceneId`,
        ),
        durationSec: expectNumberCoerced(
          record.durationSec,
          `sceneJson.scenes[${index}].durationSec`,
        ),
        narration: expectNullableString(
          record.narration,
          `sceneJson.scenes[${index}].narration`,
        ),
        disableNarration: expectOptionalBoolean(
          record.disableNarration,
          `sceneJson.scenes[${index}].disableNarration`,
        ),
        imagePrompt: expectString(
          record.imagePrompt,
          `sceneJson.scenes[${index}].imagePrompt`,
        ),
        videoPrompt: expectOptionalString(
          record.videoPrompt,
          `sceneJson.scenes[${index}].videoPrompt`,
        ),
        subtitle: expectString(
          record.subtitle,
          `sceneJson.scenes[${index}].subtitle`,
        ),
        bgmMood: expectOptionalString(
          record.bgmMood,
          `sceneJson.scenes[${index}].bgmMood`,
        ),
        sfx: Array.isArray(record.sfx)
          ? record.sfx.map((entry, sfxIndex) =>
              expectString(
                entry,
                `sceneJson.scenes[${index}].sfx[${sfxIndex}]`,
              ),
            )
          : undefined,
        startTransition: parseOptionalStartTransition(
          record.startTransition,
          `sceneJson.scenes[${index}].startTransition`,
        ),
      };
    }),
  };
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
): Promise<SceneJson> => {
  const generateStructuredData =
    deps.generateStructuredData ?? generateStepStructuredData;
  const presetVariables = buildPresetPromptVariables(event.resolvedPolicy);
  const promptTemplateOverride = resolveSceneJsonPromptOverride(
    event.resolvedPolicy,
  );

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
      creativeBrief: event.creativeBrief ?? "",
    },
    ...(promptTemplateOverride ? { promptTemplateOverride } : {}),
    validate: validateSceneJson,
    buildMockResult: () => buildMockSceneJson(event),
  });

  return applyDefaultSceneStartTransitions(
    alignSceneJsonNarrationAndSubtitle(result.output),
  );
};
