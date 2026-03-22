import {
  generateStepStructuredData,
  type GenerateStructuredData,
} from "../../shared/lib/llm";
import {
  expectArray,
  expectNullableString,
  expectNumberCoerced,
  expectOptionalString,
  expectRecord,
  expectString,
} from "../../shared/lib/llm/validate";
import { SceneJson } from "../../../types/render/scene-json";

type TopicPlanResult = {
  jobId: string;
  topicId: string;
  contentId: string;
  contentType?: string;
  variant?: string;
  targetLanguage: string;
  targetDurationSec: number;
  titleIdea: string;
  stylePreset: string;
  creativeBrief?: string;
  autoPublish?: boolean;
  publishAt?: string;
};

export type SceneJsonResult = TopicPlanResult & {
  status: string;
  sceneJsonS3Key: string;
  sceneJson: SceneJson;
};

const buildMockSceneJson = (event: TopicPlanResult): SceneJson => {
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
        subtitle: "The fortress did not sleep.",
        bgmMood: "dark_ambient",
      },
      {
        sceneId: 2,
        durationSec: 8,
        narration: "Every footstep carried farther in the cold air.",
        imagePrompt:
          "ancient Korean stone path at night, fog, moonlight, cinematic",
        videoPrompt: "slow dolly across moonlit Korean stone path, subtle mist",
        subtitle: "Every footstep carried farther.",
        bgmMood: "dark_ambient",
      },
    ],
  };
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
      };
    }),
  };
};

type BuildSceneJsonDeps = {
  generateStructuredData?: GenerateStructuredData;
};

export const buildSceneJson = async (
  event: TopicPlanResult,
  deps: BuildSceneJsonDeps = {},
): Promise<SceneJson> => {
  const generateStructuredData =
    deps.generateStructuredData ?? generateStepStructuredData;

  const result = await generateStructuredData({
    jobId: event.jobId,
    stepKey: "scene-json",
    variables: {
      titleIdea: event.titleIdea,
      targetLanguage: event.targetLanguage,
      targetDurationSec: event.targetDurationSec,
      stylePreset: event.stylePreset,
      creativeBrief: event.creativeBrief ?? "",
    },
    validate: validateSceneJson,
    buildMockResult: () => buildMockSceneJson(event),
  });

  return result.output;
};
