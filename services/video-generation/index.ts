import { Handler } from "aws-lambda";
import type { SceneJson } from "../../types/render/scene-json";
import { pickSceneByReviewTarget } from "../shared/lib/workflow/pick-scene-for-review-regeneration";
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
  sceneJson?: SceneJson;
  reviewDecision?: {
    action?: string;
    regenerationScope?: string;
    targetSceneId?: number;
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

  if (typeof event.reviewDecision?.targetSceneId === "number") {
    const picked = pickSceneByReviewTarget(event);
    if (!picked) {
      throw new Error(
        `targetSceneId ${event.reviewDecision.targetSceneId} not found in sceneJson`,
      );
    }
    return [
      {
        sceneId: picked.sceneId,
        videoPrompt: picked.videoPrompt,
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
  const bytePlusSecretId = process.env.BYTEPLUS_VIDEO_SECRET_ID?.trim();
  const videoAssets = await generateSceneVideos({
    jobId: event.jobId,
    scenes,
    secretId: (bytePlusSecretId || process.env.RUNWAY_SECRET_ID) ?? "",
    provider: bytePlusSecretId ? "byteplus" : "runway",
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
