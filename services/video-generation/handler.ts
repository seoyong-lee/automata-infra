import { Handler } from "aws-lambda";
import { generateSceneVideo } from "../shared/lib/providers/media";
import { putSceneAsset } from "../shared/lib/store/video-jobs";

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
  const videoAssets = [];

  for (const scene of event.sceneJson.scenes) {
    const asset = await generateSceneVideo({
      jobId: event.jobId,
      sceneId: scene.sceneId,
      prompt: scene.videoPrompt,
      secretId: process.env.RUNWAY_SECRET_ID ?? "",
    });

    videoAssets.push(asset);
    await putSceneAsset(event.jobId, scene.sceneId, asset);
  }

  return {
    ...event,
    videoAssets,
  };
};
