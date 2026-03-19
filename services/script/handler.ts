import { Handler } from "aws-lambda";
import { putJsonToS3 } from "../shared/lib/aws/runtime";
import { putSceneAsset, updateJobMeta } from "../shared/lib/store/video-jobs";
import { SceneJson } from "../../types/render/scene-json";

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
  sceneJsonS3Key: string;
  sceneJson: SceneJson;
};

const buildSceneJson = (event: TopicPlanResult): SceneJson => {
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

const persistScenes = async (
  jobId: string,
  sceneJson: SceneJson,
): Promise<void> => {
  for (const scene of sceneJson.scenes) {
    await putSceneAsset(jobId, scene.sceneId, {
      visualType: scene.videoPrompt ? "image+motion" : "image",
      durationSec: scene.durationSec,
      narration: scene.narration,
      subtitle: scene.subtitle,
      imagePrompt: scene.imagePrompt,
      videoPrompt: scene.videoPrompt,
      validationStatus: "PENDING",
    });
  }
};

export const handler: Handler<TopicPlanResult, SceneJsonResult> = async (
  event,
) => {
  const sceneJson = buildSceneJson(event);
  const sceneJsonS3Key = `scene-json/${event.jobId}/scene.json`;
  await putJsonToS3(sceneJsonS3Key, sceneJson);
  await persistScenes(event.jobId, sceneJson);

  await updateJobMeta(
    event.jobId,
    {
      sceneJsonS3Key,
      videoTitle: sceneJson.videoTitle,
    },
    "SCENE_JSON_READY",
  );

  return {
    ...event,
    status: "SCENE_JSON_READY",
    sceneJsonS3Key,
    sceneJson,
  };
};
