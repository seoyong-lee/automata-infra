import {
  getBufferFromS3,
  getJsonFromS3,
} from "../../../../shared/lib/aws/runtime";
import { invokePipelineWorkerAsync } from "../../../../shared/lib/aws/invoke-pipeline-worker";
import {
  startJobExecution,
  startQueuedJobExecution,
} from "../../../../shared/lib/store/job-execution";
import {
  getSceneAsset,
  listSceneAssets,
  updateJobMeta,
} from "../../../../shared/lib/store/video-jobs";
import { getVoiceProfile } from "../../../../shared/lib/store/voice-profiles";
import { generateSceneImages } from "../../../../image/usecase/generate-scene-images";
import { saveImageAssets } from "../../../../image/repo/save-image-assets";
import { generateSceneVideos } from "../../../../video-generation/usecase/generate-scene-videos";
import { saveVideoAssets } from "../../../../video-generation/repo/save-video-assets";
import { generateSceneVoices } from "../../../../voice/usecase/generate-scene-voices";
import { saveVoiceAssets } from "../../../../voice/repo/save-voice-assets";
import { resolveSceneJsonS3KeyForAssetGeneration } from "../../../shared/lib/resolve-approved-pipeline-input";
import {
  getJobOrThrow,
  getStoredContentBrief,
  getStoredJobBrief,
} from "../../../shared/repo/job-draft-store";
import { mapJobMetaToAdminJob } from "../../../shared/mapper/map-job-meta-to-admin-job";
import { persistAssetManifestForJob } from "../repo/persist-asset-manifest";
import { notFound } from "../../../shared/errors";
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
  imageProvider?: "openai" | "byteplus";
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
    ...(parsed.imageProvider === "OPENAI"
      ? { imageProvider: "openai" as const }
      : parsed.imageProvider === "SEEDREAM"
        ? { imageProvider: "byteplus" as const }
        : {}),
  };
};

const isFullStrictFinalize = (scope: AssetGenerationScope): boolean =>
  scope.targetSceneId === undefined && scope.modality === "all";

type AssetGenerationContext = {
  sceneJson: SceneJson;
  scenes: SceneDefinition[];
  sceneJsonS3Key: string;
};

type AssetGenerationPolicy = {
  allowImage: boolean;
  allowVoice: boolean;
  allowVideo: boolean;
  preferredImageProvider?: "openai" | "byteplus";
};

const toDataUri = (input: { buffer: Buffer; contentType?: string }): string => {
  return `data:${input.contentType ?? "image/png"};base64,${input.buffer.toString("base64")}`;
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

const resolvePreferredImageProvider = (
  value?: string,
): "openai" | "byteplus" | undefined => {
  if (value === "openai") {
    return "openai";
  }
  if (value === "byteplus") {
    return "byteplus";
  }
  return undefined;
};

const loadAssetGenerationPolicy = async (
  jobId: string,
): Promise<AssetGenerationPolicy> => {
  const job = await getJobOrThrow(jobId);
  const [jobBrief, contentBrief] = await Promise.all([
    getStoredJobBrief(job),
    getStoredContentBrief(job),
  ]);
  const resolvedPolicy =
    jobBrief?.resolvedPolicy ?? contentBrief?.resolvedPolicy ?? undefined;
  if (!resolvedPolicy) {
    return {
      allowImage: true,
      allowVoice: true,
      allowVideo: true,
    };
  }

  return {
    allowImage:
      resolvedPolicy.capabilities.supportsAiImage ||
      resolvedPolicy.capabilities.supportsStockImage,
    allowVoice: resolvedPolicy.capabilities.voiceMode !== "disabled",
    allowVideo:
      resolvedPolicy.capabilities.supportsAiVideo ||
      resolvedPolicy.capabilities.supportsStockVideo,
    preferredImageProvider: resolvePreferredImageProvider(
      resolvedPolicy.preferredImageProvider,
    ),
  };
};

const assertModalityAllowed = (
  scope: AssetGenerationScope,
  policy: AssetGenerationPolicy,
): void => {
  if (scope.modality === "image" && !policy.allowImage) {
    throw new Error("image generation is disabled for this preset");
  }
  if (scope.modality === "voice" && !policy.allowVoice) {
    throw new Error("voice generation is disabled for this preset");
  }
  if (scope.modality === "video" && !policy.allowVideo) {
    throw new Error("video generation is disabled for this preset");
  }
};

const runImageModalityForScenes = async (
  jobId: string,
  scenes: SceneDefinition[],
  scope: AssetGenerationScope,
  policy?: AssetGenerationPolicy,
) => {
  const bytePlusSecretId = process.env.BYTEPLUS_IMAGE_SECRET_ID?.trim();
  const openAiSecretId = process.env.OPENAI_SECRET_ID?.trim();
  const imageScenes = scenes.map((scene) => ({
    sceneId: scene.sceneId,
    imagePrompt: scene.imagePrompt,
  }));
  const provider =
    scope.imageProvider ??
    policy?.preferredImageProvider ??
    (bytePlusSecretId ? "byteplus" : "openai");
  const secretId = provider === "byteplus" ? bytePlusSecretId : openAiSecretId;
  if (!secretId) {
    throw new Error(
      provider === "byteplus"
        ? "BYTEPLUS_IMAGE_SECRET_ID is not configured"
        : "OPENAI_SECRET_ID is not configured",
    );
  }
  const imageAssets = await generateSceneImages({
    jobId,
    scenes: imageScenes,
    secretId,
    provider,
  });
  await saveImageAssets({
    jobId,
    scenes: imageScenes,
    imageAssets,
    markStatus: false,
  });
};

export const resolveTargetVideoDurationSec = (input: {
  scene: SceneDefinition;
  voiceDurationSec?: number;
}): number => {
  const plannedDurationSec =
    typeof input.scene.durationSec === "number" &&
    Number.isFinite(input.scene.durationSec)
      ? input.scene.durationSec
      : 0;
  const voiceDurationSec =
    typeof input.voiceDurationSec === "number" &&
    Number.isFinite(input.voiceDurationSec)
      ? input.voiceDurationSec
      : 0;
  return Math.max(0.1, plannedDurationSec, voiceDurationSec);
};

type ListedSceneAsset = Awaited<ReturnType<typeof listSceneAssets>>[number];
type VoiceProfile = Awaited<ReturnType<typeof getVoiceProfile>>;

const resolveNonEmptyString = (value: unknown): string | undefined => {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
};

const buildSceneAssetMap = (
  sceneAssets: ListedSceneAsset[],
): Map<number, ListedSceneAsset> => {
  return new Map(sceneAssets.map((asset) => [asset.sceneId, asset]));
};

const resolveVoiceProfileId = (input: {
  sceneId: number;
  sceneAssetMap: Map<number, ListedSceneAsset>;
  defaultVoiceProfileId?: string;
}): string | undefined => {
  const sceneProfileId = resolveNonEmptyString(
    input.sceneAssetMap.get(input.sceneId)?.voiceProfileId,
  );
  if (sceneProfileId) {
    return sceneProfileId;
  }
  return resolveNonEmptyString(input.defaultVoiceProfileId);
};

const buildVoiceSettings = (profile: VoiceProfile) => ({
  ...(typeof profile?.speed === "number" ? { speed: profile.speed } : {}),
  ...(typeof profile?.stability === "number"
    ? { stability: profile.stability }
    : {}),
  ...(typeof profile?.similarityBoost === "number"
    ? { similarityBoost: profile.similarityBoost }
    : {}),
  ...(typeof profile?.style === "number" ? { style: profile.style } : {}),
  ...(typeof profile?.useSpeakerBoost === "boolean"
    ? { useSpeakerBoost: profile.useSpeakerBoost }
    : {}),
});

const buildVoiceScene = async (input: {
  scene: SceneDefinition;
  sceneAssetMap: Map<number, ListedSceneAsset>;
  defaultVoiceProfileId?: string;
}) => {
  const selectedProfileId = resolveVoiceProfileId({
    sceneId: input.scene.sceneId,
    sceneAssetMap: input.sceneAssetMap,
    defaultVoiceProfileId: input.defaultVoiceProfileId,
  });
  const selectedProfile = selectedProfileId
    ? await getVoiceProfile(selectedProfileId)
    : null;
  if (selectedProfileId && !selectedProfile) {
    throw notFound(`voice profile not found: ${selectedProfileId}`);
  }

  return {
    sceneId: input.scene.sceneId,
    narration: input.scene.narration,
    disableNarration: input.scene.disableNarration,
    durationSec: input.scene.durationSec,
    voiceProfileId: selectedProfile?.profileId,
    voiceId: selectedProfile?.voiceId,
    modelId: selectedProfile?.modelId,
    voiceSettings: buildVoiceSettings(selectedProfile),
  };
};

const runVideoModalityForScenes = async (
  jobId: string,
  scenes: SceneDefinition[],
) => {
  const bytePlusSecretId = process.env.BYTEPLUS_VIDEO_SECRET_ID?.trim();
  const videoScenes = await Promise.all(
    scenes.map(async (scene) => {
      const sceneAsset = await getSceneAsset(jobId, scene.sceneId);
      const selectedImageS3Key =
        typeof sceneAsset?.imageS3Key === "string"
          ? sceneAsset.imageS3Key
          : undefined;
      const selectedImage =
        selectedImageS3Key !== undefined
          ? await getBufferFromS3(selectedImageS3Key)
          : null;
      const voiceDurationSec =
        typeof sceneAsset?.voiceDurationSec === "number"
          ? sceneAsset.voiceDurationSec
          : undefined;
      return {
        sceneId: scene.sceneId,
        videoPrompt: scene.videoPrompt,
        targetDurationSec: resolveTargetVideoDurationSec({
          scene,
          voiceDurationSec,
        }),
        selectedImageS3Key,
        selectedImageDataUri: selectedImage
          ? toDataUri(selectedImage)
          : undefined,
      };
    }),
  );
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
  const job = await getJobOrThrow(jobId);
  const sceneAssetMap = buildSceneAssetMap(await listSceneAssets(jobId));
  const voiceScenes = await Promise.all(
    scenes.map((scene) =>
      buildVoiceScene({
        scene,
        sceneAssetMap,
        defaultVoiceProfileId: job.defaultVoiceProfileId,
      }),
    ),
  );
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
  const policy = await loadAssetGenerationPolicy(jobId);

  await updateJobMeta(jobId, {}, "ASSET_GENERATING");
  const modality = scope.modality;
  assertModalityAllowed(scope, policy);

  if ((modality === "all" && policy.allowImage) || modality === "image") {
    await runImageModalityForScenes(jobId, scenes, scope, policy);
  }
  if ((modality === "all" && policy.allowVoice) || modality === "voice") {
    await runVoiceModalityForScenes(jobId, scenes);
  }
  if ((modality === "all" && policy.allowVideo) || modality === "video") {
    await runVideoModalityForScenes(jobId, scenes);
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
