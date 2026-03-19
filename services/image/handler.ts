import { Handler } from "aws-lambda";

type SceneJsonEvent = {
  jobId: string;
  sceneJson: {
    scenes: Array<{
      sceneId: number;
      imagePrompt: string;
    }>;
  };
};

export const handler: Handler<
  SceneJsonEvent,
  SceneJsonEvent & { imageAssets: unknown[] }
> = async (event) => {
  const imageAssets = event.sceneJson.scenes.map((scene) => ({
    sceneId: scene.sceneId,
    imagePrompt: scene.imagePrompt,
    imageS3Key: `assets/${event.jobId}/images/scene-${scene.sceneId}.png`,
  }));

  return {
    ...event,
    imageAssets,
  };
};
