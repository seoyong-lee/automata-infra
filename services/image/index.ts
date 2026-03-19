import { Handler } from "aws-lambda";
import { saveImageAssets } from "./repo/save-image-assets";
import { generateSceneImages } from "./usecase/generate-scene-images";

type SceneJsonEvent = {
  jobId: string;
  sceneId?: number;
  imagePrompt?: string;
  scene?: {
    sceneId: number;
    imagePrompt: string;
  };
  sceneJson?: {
    scenes: Array<{
      sceneId: number;
      imagePrompt: string;
    }>;
  };
};

const getScenes = (event: SceneJsonEvent) => {
  if (event.scene) {
    return [event.scene];
  }

  if (typeof event.sceneId === "number" && event.imagePrompt) {
    return [
      {
        sceneId: event.sceneId,
        imagePrompt: event.imagePrompt,
      },
    ];
  }

  return event.sceneJson?.scenes ?? [];
};

export const run: Handler<
  SceneJsonEvent,
  SceneJsonEvent & { imageAssets: unknown[]; status: string }
> = async (event) => {
  const scenes = getScenes(event);
  const imageAssets = await generateSceneImages({
    jobId: event.jobId,
    scenes,
    secretId: process.env.OPENAI_SECRET_ID ?? "",
  });
  await saveImageAssets({
    jobId: event.jobId,
    scenes,
    imageAssets,
    markStatus: !event.scene,
  });

  return {
    ...event,
    imageAssets,
    status: "ASSET_GENERATING",
  };
};
