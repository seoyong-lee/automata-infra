import { Handler } from "aws-lambda";

type SceneJsonEvent = {
  jobId: string;
  sceneJson: {
    scenes: Array<{
      sceneId: number;
      narration: string;
      durationSec: number;
    }>;
  };
};

export const handler: Handler<
  SceneJsonEvent,
  SceneJsonEvent & { voiceAssets: unknown[] }
> = async (event) => {
  const voiceAssets = event.sceneJson.scenes.map((scene) => ({
    sceneId: scene.sceneId,
    narration: scene.narration,
    durationSec: scene.durationSec,
    voiceS3Key: `assets/${event.jobId}/tts/scene-${scene.sceneId}.mp3`,
  }));

  return {
    ...event,
    voiceAssets,
  };
};
