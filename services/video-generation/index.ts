import { Handler } from "aws-lambda";
import { saveVideoAssets } from "./repo/save-video-assets";
import { generateSceneVideos } from "./usecase/generate-scene-videos";

type SceneJsonEvent = {
  jobId: string;
  sceneJson: {
    scenes: Array<{
      sceneId: number;
      videoPrompt: string;
    }>;
  };
};

export const run: Handler<
  SceneJsonEvent,
  SceneJsonEvent & { videoAssets: unknown[] }
> = async (event) => {
  const videoAssets = await generateSceneVideos({
    jobId: event.jobId,
    scenes: event.sceneJson.scenes,
    secretId: process.env.RUNWAY_SECRET_ID ?? "",
  });
  await saveVideoAssets({
    jobId: event.jobId,
    scenes: event.sceneJson.scenes,
    videoAssets,
  });

  return {
    ...event,
    videoAssets,
  };
};
