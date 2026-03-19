import { Handler } from "aws-lambda";

type TopicPlanResult = {
  jobId: string;
  topicId: string;
  channelId: string;
  targetLanguage: string;
  targetDurationSec: number;
  titleIdea: string;
  stylePreset: string;
};

type SceneJsonResult = TopicPlanResult & {
  status: string;
  sceneJson: {
    videoTitle: string;
    language: string;
    scenes: Array<{
      sceneId: number;
      durationSec: number;
      narration: string;
      imagePrompt: string;
      videoPrompt: string;
      subtitle: string;
      bgmMood: string;
    }>;
  };
};

export const handler: Handler<TopicPlanResult, SceneJsonResult> = async (
  event,
) => {
  return {
    ...event,
    status: "SCENE_JSON_READY",
    sceneJson: {
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
          videoPrompt:
            "slow dolly across moonlit Korean stone path, subtle mist",
          subtitle: "Every footstep carried farther.",
          bgmMood: "dark_ambient",
        },
      ],
    },
  };
};
