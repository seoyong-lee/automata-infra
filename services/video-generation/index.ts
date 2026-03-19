import { Handler } from "aws-lambda";
import { saveVideoAssets } from "./repo/save-video-assets";
import { generateSceneVideos } from "./usecase/generate-scene-videos";

type SceneJsonEvent = {
  jobId: string;
  sceneId?: number;
  videoPrompt?: string;
  scene?: {
    sceneId: number;
    videoPrompt?: string;
  };
  sceneJson?: {
    scenes: Array<{
      sceneId: number;
      videoPrompt?: string;
    }>;
  };
};

const getScenes = (event: SceneJsonEvent) => {
  if (event.scene) {
    return [event.scene];
  }

  if (typeof event.sceneId === "number") {
    return [
      {
        sceneId: event.sceneId,
        videoPrompt: event.videoPrompt,
      },
    ];
  }

  return event.sceneJson?.scenes ?? [];
};

export const run: Handler<
  SceneJsonEvent,
  SceneJsonEvent & { videoAssets: unknown[] }
> = async (event) => {
  const scenes = getScenes(event);
  const videoAssets = await generateSceneVideos({
    jobId: event.jobId,
    scenes,
    secretId: process.env.RUNWAY_SECRET_ID ?? "",
  });
  await saveVideoAssets({
    jobId: event.jobId,
    scenes,
    videoAssets,
  });

  return {
    ...event,
    videoAssets,
  };
};
