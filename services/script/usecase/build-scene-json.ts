import { SceneJson } from "../../../types/render/scene-json";

type TopicPlanResult = {
  jobId: string;
  topicId: string;
  channelId: string;
  targetLanguage: string;
  targetDurationSec: number;
  titleIdea: string;
  stylePreset: string;
};

export type SceneJsonResult = TopicPlanResult & {
  status: string;
  sceneJsonS3Key: string;
  sceneJson: SceneJson;
};

export const buildSceneJson = (event: TopicPlanResult): SceneJson => {
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
