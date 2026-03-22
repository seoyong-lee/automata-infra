import { getJsonFromS3 } from "../../../../shared/lib/aws/runtime";
import { listSceneAssets } from "../../../../shared/lib/store/video-jobs";
import { run as runFinalCompositionStage } from "../../../../composition/final-composition";
import { run as runRenderPlanStage } from "../../../../composition/render-plan";
import { run as runValidateAssetsStage } from "../../../../composition/validate-assets";
import { getJobOrThrow } from "../../shared/repo/job-draft-store";
import { mapJobMetaToAdminJob } from "../../shared/mapper/map-job-meta-to-admin-job";

import type { SceneJson } from "../../../../../types/render/scene-json";

type RenderPipelineContext = {
  jobId: string;
  sceneJson: SceneJson;
  imageAssets: Array<{ sceneId: number; imageS3Key?: string }>;
  videoAssets: Array<{ sceneId: number; videoClipS3Key?: string }>;
  voiceAssets: Array<{ sceneId: number; voiceS3Key?: string }>;
};

type RenderPlanResult = {
  renderPlan?: Record<string, unknown> & { totalDurationSec?: number };
};

const noopCallback = (() => undefined) as never;
const noopContext = {} as never;

const loadRenderPipelineContext = async (
  jobId: string,
): Promise<RenderPipelineContext> => {
  const job = await getJobOrThrow(jobId);
  const sceneJsonS3Key = job.sceneJsonS3Key?.trim();
  if (!sceneJsonS3Key) {
    throw new Error("scene json not found");
  }

  const sceneJson = await getJsonFromS3<SceneJson>(sceneJsonS3Key);
  if (!sceneJson) {
    throw new Error("scene json payload not found");
  }

  const sceneAssets = await listSceneAssets(jobId);

  return {
    jobId,
    sceneJson,
    imageAssets: sceneAssets.map((asset) => ({
      sceneId: asset.sceneId,
      imageS3Key:
        typeof asset.imageS3Key === "string" ? asset.imageS3Key : undefined,
    })),
    videoAssets: sceneAssets.map((asset) => ({
      sceneId: asset.sceneId,
      videoClipS3Key:
        typeof asset.videoClipS3Key === "string"
          ? asset.videoClipS3Key
          : undefined,
    })),
    voiceAssets: sceneAssets.map((asset) => ({
      sceneId: asset.sceneId,
      voiceS3Key:
        typeof asset.voiceS3Key === "string" ? asset.voiceS3Key : undefined,
    })),
  };
};

export const runAdminFinalComposition = async (
  jobId: string,
): Promise<ReturnType<typeof mapJobMetaToAdminJob>> => {
  const context = await loadRenderPipelineContext(jobId);

  await runValidateAssetsStage(
    {
      jobId,
      sceneJson: context.sceneJson,
      imageAssets: context.imageAssets,
      videoAssets: context.videoAssets,
      voiceAssets: context.voiceAssets,
    },
    noopContext,
    noopCallback,
  );

  const renderPlanResult = (await runRenderPlanStage(
    {
      jobId,
      sceneJson: context.sceneJson,
      imageAssets: context.imageAssets,
      videoAssets: context.videoAssets,
      voiceAssets: context.voiceAssets,
    },
    noopContext,
    noopCallback,
  )) as RenderPlanResult;

  const renderPlan = renderPlanResult.renderPlan;
  if (!renderPlan || typeof renderPlan !== "object") {
    throw new Error("render plan not created");
  }

  await runFinalCompositionStage(
    {
      jobId,
      renderPlan: renderPlan as Record<string, unknown> & {
        totalDurationSec: number;
      },
    },
    noopContext,
    noopCallback,
  );

  const updated = await getJobOrThrow(jobId);
  return mapJobMetaToAdminJob(updated);
};
