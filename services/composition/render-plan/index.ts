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
    videoTitle: string;
    language: string;
    scenes: Array<{
      sceneId: number;
      durationSec: number;
      narration: string;
      subtitle: string;
      bgmMood?: string;
      sfx?: string[];
    }>;
  };
  imageAssets?: Array<{
    sceneId: number;
    imageS3Key?: string;
  }>;
  videoAssets?: Array<{
    sceneId: number;
    videoClipS3Key?: string;
  }>;
  voiceAssets?: Array<{
    sceneId: number;
    voiceS3Key?: string;
    voiceDurationSec?: number;
  }>;
};

const SCENE_GAP_SEC = 0.5;

export const buildRenderPlanScenes = (
  event: RenderPlanEvent,
): { totalDurationSec: number; scenes: Array<Record<string, unknown>> } => {
  let cursorSec = 0;
  const imageAssets = event.imageAssets ?? [];
  const videoAssets = event.videoAssets ?? [];
  const voiceAssets = event.voiceAssets ?? [];

  const scenes = event.sceneJson.scenes.map((scene, index) => {
    const imageAsset = imageAssets.find(
      (asset) => asset.sceneId === scene.sceneId,
    );
    const voiceAsset = voiceAssets.find(
      (asset) => asset.sceneId === scene.sceneId,
    );
    const videoAsset = videoAssets.find(
      (asset) => asset.sceneId === scene.sceneId,
    );
    const sceneDurationSec = Math.max(0.1, scene.durationSec);
    const startSec = cursorSec;
    const endSec = startSec + sceneDurationSec;
    const gapAfterSec =
      index < event.sceneJson.scenes.length - 1 ? SCENE_GAP_SEC : 0;
    cursorSec = endSec + gapAfterSec;

    return {
      sceneId: scene.sceneId,
      startSec,
      endSec,
      gapAfterSec,
      imageS3Key: imageAsset?.imageS3Key,
      videoClipS3Key: videoAsset?.videoClipS3Key,
      voiceS3Key: voiceAsset?.voiceS3Key,
      subtitle: scene.subtitle,
      bgmMood: scene.bgmMood,
      sfx: scene.sfx,
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
  const videoAssets =
    event.videoAssets ??
    sceneAssets.map((scene) => ({
      sceneId: scene.sceneId,
      videoClipS3Key:
        typeof scene.videoClipS3Key === "string"
          ? scene.videoClipS3Key
          : undefined,
    }));
  const builtScenes = buildRenderPlanScenes({
    ...event,
    imageAssets,
    videoAssets,
    voiceAssets,
  });
  const renderPlan = {
    videoTitle: event.sceneJson.videoTitle,
    language: event.sceneJson.language,
    totalDurationSec: builtScenes.totalDurationSec,
    scenes: builtScenes.scenes,
    soundtrackMood:
      event.sceneJson.scenes.find(
        (scene) =>
          typeof scene.bgmMood === "string" && scene.bgmMood.trim().length > 0,
      )?.bgmMood ?? undefined,
    outputKey: `render-plans/${event.jobId}/render-plan.json`,
  };

  await persistRenderPlan(event.jobId, renderPlan);

  return {
    ...event,
    status: "RENDER_PLAN_READY",
    renderPlan,
  };
};
