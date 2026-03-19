import { Handler } from "aws-lambda";
import { saveImageAssets } from "./repo/save-image-assets";
import { generateSceneImages } from "./usecase/generate-scene-images";

type SceneJsonEvent = {
  jobId: string;
  sceneJson: {
    scenes: Array<{
      sceneId: number;
      imagePrompt: string;
    }>;
  };
};

export const run: Handler<
  SceneJsonEvent,
  SceneJsonEvent & { imageAssets: unknown[]; status: string }
> = async (event) => {
  const imageAssets = await generateSceneImages({
    jobId: event.jobId,
    scenes: event.sceneJson.scenes,
    secretId: process.env.OPENAI_SECRET_ID ?? "",
  });
  await saveImageAssets({
    jobId: event.jobId,
    scenes: event.sceneJson.scenes,
    imageAssets,
  });

  return {
    ...event,
    imageAssets,
    status: "ASSET_GENERATING",
  };
};
