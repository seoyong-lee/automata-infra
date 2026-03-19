import { Handler } from "aws-lambda";
import { putJsonToS3 } from "../../shared/lib/aws/runtime";
import {
  listSceneAssets,
  putRenderArtifact,
  updateJobMeta,
} from "../../shared/lib/store/video-jobs";

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
    imageS3Key?: string;
  }>;
  voiceAssets?: Array<{
    sceneId: number;
    voiceS3Key?: string;
  }>;
};

export const buildRenderPlanScenes = (
  event: RenderPlanEvent,
): { totalDurationSec: number; scenes: Array<Record<string, unknown>> } => {
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
    totalDurationSec: cursorSec,
    scenes,
  };
};

const persistRenderPlan = async (
  jobId: string,
  renderPlan: { outputKey: string },
): Promise<void> => {
  await putJsonToS3(renderPlan.outputKey, renderPlan);
  await putRenderArtifact(jobId, {
    renderPlanS3Key: renderPlan.outputKey,
    createdAt: new Date().toISOString(),
  });
  await updateJobMeta(
    jobId,
    {
      renderPlanS3Key: renderPlan.outputKey,
    },
    "RENDER_PLAN_READY",
  );
};

export const run: Handler<
  RenderPlanEvent,
  RenderPlanEvent & { renderPlan: unknown; status: string }
> = async (event) => {
  const sceneAssets = await listSceneAssets(event.jobId);
  const imageAssets =
    event.imageAssets ??
    sceneAssets.map((scene) => ({
      sceneId: scene.sceneId,
      imageS3Key:
        typeof scene.imageS3Key === "string" ? scene.imageS3Key : undefined,
    }));
  const voiceAssets =
    event.voiceAssets ??
    sceneAssets.map((scene) => ({
      sceneId: scene.sceneId,
      voiceS3Key:
        typeof scene.voiceS3Key === "string" ? scene.voiceS3Key : undefined,
    }));
  const builtScenes = buildRenderPlanScenes({
    ...event,
    imageAssets,
    voiceAssets,
  });
  const renderPlan = {
    totalDurationSec: builtScenes.totalDurationSec,
    scenes: builtScenes.scenes,
    outputKey: `render-plans/${event.jobId}/render-plan.json`,
  };

  await persistRenderPlan(event.jobId, renderPlan);

  return {
    ...event,
    status: "RENDER_PLAN_READY",
    renderPlan,
  };
};
