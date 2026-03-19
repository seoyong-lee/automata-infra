import { Handler } from "aws-lambda";

type RenderPlanEvent = {
  jobId: string;
  sceneJson: {
    scenes: Array<{
      sceneId: number;
      durationSec: number;
      subtitle: string;
    }>;
  };
  imageAssets?: Array<{
    sceneId: number;
    imageS3Key: string;
  }>;
  voiceAssets?: Array<{
    sceneId: number;
    voiceS3Key: string;
  }>;
};

export const handler: Handler<
  RenderPlanEvent,
  RenderPlanEvent & { renderPlan: unknown; status: string }
> = async (event) => {
  let cursorSec = 0;
  const imageAssets = event.imageAssets ?? [];
  const voiceAssets = event.voiceAssets ?? [];

  const scenes = event.sceneJson.scenes.map((scene) => {
    const startSec = cursorSec;
    cursorSec += scene.durationSec;

    const imageAsset = imageAssets.find(
      (asset) => asset.sceneId === scene.sceneId,
    );
    const voiceAsset = voiceAssets.find(
      (asset) => asset.sceneId === scene.sceneId,
    );

    return {
      sceneId: scene.sceneId,
      startSec,
      endSec: cursorSec,
      imageS3Key: imageAsset?.imageS3Key,
      voiceS3Key: voiceAsset?.voiceS3Key,
      subtitle: scene.subtitle,
    };
  });

  return {
    ...event,
    status: "RENDER_PLAN_READY",
    renderPlan: {
      totalDurationSec: cursorSec,
      scenes,
      outputKey: `render-plans/${event.jobId}/render-plan.json`,
    },
  };
};
