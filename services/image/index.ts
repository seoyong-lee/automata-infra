import { Handler } from "aws-lambda";
import type { SceneJson } from "../../types/render/scene-json";
import { pickSceneByReviewTarget } from "../shared/lib/workflow/pick-scene-for-review-regeneration";
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

  if (typeof event.sceneId === "number" && event.imagePrompt) {
    return [
      {
        sceneId: event.sceneId,
        imagePrompt: event.imagePrompt,
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
        imagePrompt: picked.imagePrompt,
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
