import { Handler } from "aws-lambda";
import { generateSceneImage } from "../shared/lib/providers/media";
import { putSceneAsset, updateJobMeta } from "../shared/lib/store/video-jobs";

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
  SceneJsonEvent & { imageAssets: unknown[]; status: string }
> = async (event) => {
  const imageAssets = [];

  for (const scene of event.sceneJson.scenes) {
    const asset = await generateSceneImage({
      jobId: event.jobId,
      sceneId: scene.sceneId,
      prompt: scene.imagePrompt,
      secretId: process.env.OPENAI_SECRET_ID ?? "",
    });

    imageAssets.push(asset);
    await putSceneAsset(event.jobId, scene.sceneId, asset);
  }

  await updateJobMeta(event.jobId, {}, "ASSET_GENERATING");

  return {
    ...event,
    imageAssets,
    status: "ASSET_GENERATING",
  };
};
