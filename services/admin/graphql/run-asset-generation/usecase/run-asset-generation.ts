import { getJsonFromS3 } from "../../../../shared/lib/aws/runtime";
import { invokePipelineWorkerAsync } from "../../../../shared/lib/aws/invoke-pipeline-worker";
import {
  startJobExecution,
  startQueuedJobExecution,
} from "../../../../shared/lib/store/job-execution";
import { updateJobMeta } from "../../../../shared/lib/store/video-jobs";
import { generateSceneImages } from "../../../../image/usecase/generate-scene-images";
import { saveImageAssets } from "../../../../image/repo/save-image-assets";
import { generateSceneVideos } from "../../../../video-generation/usecase/generate-scene-videos";
import { saveVideoAssets } from "../../../../video-generation/repo/save-video-assets";
import { generateSceneVoices } from "../../../../voice/usecase/generate-scene-voices";
import { saveVoiceAssets } from "../../../../voice/repo/save-voice-assets";
import { resolveSceneJsonS3KeyForAssetGeneration } from "../../shared/lib/resolve-approved-pipeline-input";
import { getJobOrThrow } from "../../shared/repo/job-draft-store";
import { mapJobMetaToAdminJob } from "../../shared/mapper/map-job-meta-to-admin-job";
import { persistAssetManifestForJob } from "../repo/persist-asset-manifest";
import {
  finalizeSceneAssetsReadiness,
  recomputeSceneAssetsReadiness,
} from "./finalize-scene-assets-readiness";
import type {
  SceneDefinition,
  SceneJson,
} from "../../../../../types/render/scene-json";
import type { ParsedRunAssetGenerationArgs } from "../normalize/parse-run-asset-generation-args";

const pipelineAsyncEnabled = (): boolean =>
  (process.env.PIPELINE_ASYNC_INVOCATION === "1" ||
    process.env.PIPELINE_ASYNC_INVOCATION === "true") &&
  Boolean(process.env.PIPELINE_WORKER_FUNCTION_NAME?.trim());

export type AssetGenerationScope = {
  targetSceneId?: number;
  modality: "all" | "image" | "voice" | "video";
};

export const toAssetGenerationScope = (
  parsed: ParsedRunAssetGenerationArgs,
): AssetGenerationScope => {
  const modalityStr =
    parsed.modality === "IMAGE"
      ? "image"
      : parsed.modality === "VOICE"
        ? "voice"
        : parsed.modality === "VIDEO"
          ? "video"
          : "all";
  return {
    ...(parsed.targetSceneId !== undefined
      ? { targetSceneId: parsed.targetSceneId }
      : {}),
    modality: modalityStr,
  };
};

const isFullStrictFinalize = (scope: AssetGenerationScope): boolean =>
  scope.targetSceneId === undefined && scope.modality === "all";

type AssetGenerationContext = {
  sceneJson: SceneJson;
  scenes: SceneDefinition[];
  sceneJsonS3Key: string;
};

const loadAssetGenerationContext = async (
  jobId: string,
  scope: AssetGenerationScope,
): Promise<AssetGenerationContext> => {
  const job = await getJobOrThrow(jobId);
  const sceneResolved = await resolveSceneJsonS3KeyForAssetGeneration(
    jobId,
    job,
  );
  if (!sceneResolved) {
    throw new Error("scene json not found");
  }
  const sceneJson = await getJsonFromS3<SceneJson>(
    sceneResolved.sceneJsonS3Key,
  );
  if (!sceneJson) {
    throw new Error("scene json payload not found");
  }

  let scenes = sceneJson.scenes;
  if (scope.targetSceneId !== undefined) {
    scenes = scenes.filter((s) => s.sceneId === scope.targetSceneId);
    if (scenes.length === 0) {
      throw new Error(`scene ${scope.targetSceneId} not found in sceneJson`);
    }
  }

  return {
    sceneJson,
    scenes,
    sceneJsonS3Key: sceneResolved.sceneJsonS3Key,
  };
};

const runImageModalityForScenes = async (
  jobId: string,
  scenes: SceneDefinition[],
) => {
  const bytePlusSecretId = process.env.BYTEPLUS_IMAGE_SECRET_ID?.trim();
  const imageScenes = scenes.map((scene) => ({
    sceneId: scene.sceneId,
    imagePrompt: scene.imagePrompt,
  }));
  const imageAssets = await generateSceneImages({
    jobId,
    scenes: imageScenes,
    secretId: (bytePlusSecretId || process.env.OPENAI_SECRET_ID) ?? "",
    provider: bytePlusSecretId ? "byteplus" : "openai",
  });
  await saveImageAssets({
    jobId,
    scenes: imageScenes,
    imageAssets,
    markStatus: false,
  });
};

const runVideoModalityForScenes = async (
  jobId: string,
  scenes: SceneDefinition[],
) => {
  const bytePlusSecretId = process.env.BYTEPLUS_VIDEO_SECRET_ID?.trim();
  const videoScenes = scenes.map((scene) => ({
    sceneId: scene.sceneId,
    videoPrompt: scene.videoPrompt,
  }));
  const videoAssets = await generateSceneVideos({
    jobId,
    scenes: videoScenes,
    secretId: (bytePlusSecretId || process.env.RUNWAY_SECRET_ID) ?? "",
    provider: bytePlusSecretId ? "byteplus" : "runway",
  });
  await saveVideoAssets({
    jobId,
    scenes: videoScenes,
    videoAssets,
  });
};

const runVoiceModalityForScenes = async (
  jobId: string,
  scenes: SceneDefinition[],
) => {
  const voiceScenes = scenes.map((scene) => ({
    sceneId: scene.sceneId,
    narration: scene.narration,
    durationSec: scene.durationSec,
  }));
  const voiceAssets = await generateSceneVoices({
    jobId,
    scenes: voiceScenes,
    secretId: process.env.ELEVENLABS_SECRET_ID ?? "",
  });
  await saveVoiceAssets({
    jobId,
    scenes: voiceScenes,
    voiceAssets,
    markStatus: false,
  });
};

export const runAssetGenerationCore = async (
  jobId: string,
  scope: AssetGenerationScope = { modality: "all" },
) => {
  const { sceneJson, scenes, sceneJsonS3Key } =
    await loadAssetGenerationContext(jobId, scope);

  await updateJobMeta(jobId, {}, "ASSET_GENERATING");
  const modality = scope.modality;

  if (modality === "all" || modality === "image") {
    await runImageModalityForScenes(jobId, scenes);
  }
  if (modality === "all" || modality === "video") {
    await runVideoModalityForScenes(jobId, scenes);
  }
  if (modality === "all" || modality === "voice") {
    await runVoiceModalityForScenes(jobId, scenes);
  }

  await persistAssetManifestForJob({
    jobId,
    sceneJsonS3Key,
  });

  if (isFullStrictFinalize(scope)) {
    await finalizeSceneAssetsReadiness({ jobId, sceneJson });
  } else {
    await recomputeSceneAssetsReadiness({ jobId, sceneJson });
  }

  const updated = await getJobOrThrow(jobId);
  return mapJobMetaToAdminJob(updated);
};

export const runAdminAssetGeneration = async (
  jobId: string,
  triggeredBy?: string,
  scope: AssetGenerationScope = { modality: "all" },
) => {
  const job = await getJobOrThrow(jobId);
  const sceneResolved = await resolveSceneJsonS3KeyForAssetGeneration(
    jobId,
    job,
  );
  if (!sceneResolved) {
    throw new Error("scene json not found");
  }
  const inputSnapshotId = sceneResolved.sceneJsonS3Key;

  if (pipelineAsyncEnabled()) {
    const { sk, finish } = await startQueuedJobExecution({
      jobId,
      stageType: "ASSET_GENERATION",
      triggeredBy,
      inputSnapshotId,
    });
    try {
      await invokePipelineWorkerAsync({
        jobId,
        executionSk: sk,
        stage: "ASSET_GENERATION",
        assetGenScope: scope,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await finish("FAILED", msg);
      throw e;
    }
    const job = await getJobOrThrow(jobId);
    return mapJobMetaToAdminJob(job);
  }

  const { finish } = await startJobExecution({
    jobId,
    stageType: "ASSET_GENERATION",
    triggeredBy,
    inputSnapshotId,
  });
  try {
    const result = await runAssetGenerationCore(jobId, scope);
    await finish(
      "SUCCEEDED",
      undefined,
      result.assetManifestS3Key ?? result.sceneJsonS3Key,
    );
    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await finish("FAILED", msg);
    throw e;
  }
};
