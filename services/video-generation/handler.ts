import { Handler } from "aws-lambda";

type SceneJsonEvent = {
  jobId: string;
  sceneJson: {
    scenes: Array<{
      sceneId: number;
      videoPrompt: string;
    }>;
  };
};

export const handler: Handler<
  SceneJsonEvent,
  SceneJsonEvent & { videoAssets: unknown[] }
> = async (event) => {
  const videoAssets = event.sceneJson.scenes.map((scene) => ({
    sceneId: scene.sceneId,
    videoPrompt: scene.videoPrompt,
    videoClipS3Key: `assets/${event.jobId}/videos/scene-${scene.sceneId}.mp4`,
  }));

  return {
    ...event,
    videoAssets,
  };
};
