import { JobMetaItem } from "../../../shared/lib/store/video-jobs";
import { collectAssetRefs } from "../normalize/collect-asset-refs";
import { readObjectMetadata } from "../repo/read-object-metadata";

type ValidateInput = {
  sceneJson: {
    scenes: Array<{
      sceneId: number;
      durationSec?: number;
      subtitle?: string;
    }>;
  };
  imageAssets?: unknown[];
  videoAssets?: unknown[];
  voiceAssets?: unknown[];
  job: JobMetaItem | null;
};

const isImageMime = (value: string | undefined): boolean => {
  return Boolean(value && value.startsWith("image/"));
};

const isAudioMime = (value: string | undefined): boolean => {
  return Boolean(value && value.startsWith("audio/"));
};

const hasNarration = (value: string | undefined): boolean => {
  return Boolean(value && value.trim().length > 0);
};

const isVideoOrJsonMime = (value: string | undefined): boolean => {
  return Boolean(
    value && (value.startsWith("video/") || value === "application/json"),
  );
};

type SceneRef = ReturnType<typeof collectAssetRefs>[number];

export const hasRenderableVisualAsset = (
  scene: Pick<SceneRef, "imageS3Key" | "videoClipS3Key">,
): boolean => {
  return Boolean(scene.imageS3Key || scene.videoClipS3Key);
};

const createValidationContext = (input: ValidateInput) => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const sceneCount = input.sceneJson.scenes.length;
  const sceneRefs = collectAssetRefs({
    scenes: input.sceneJson.scenes,
    imageAssets: input.imageAssets,
    voiceAssets: input.voiceAssets,
    videoAssets: input.videoAssets,
  });

  return {
    errors,
    warnings,
    sceneCount,
    sceneRefs,
  };
};

const validateSceneBasics = (
  scene: SceneRef,
  errors: string[],
  warnings: string[],
) => {
  if (scene.durationSec <= 0) {
    errors.push(`scene ${scene.sceneId}: durationSec must be greater than 0`);
  }

  if (scene.subtitle.length > 120) {
    warnings.push(`scene ${scene.sceneId}: subtitle length exceeds 120 chars`);
  }
};

const validateImageAsset = async (scene: SceneRef, errors: string[]) => {
  if (!scene.imageS3Key) {
    return;
  }

  const meta = await readObjectMetadata(scene.imageS3Key);
  if (!meta.exists) {
    errors.push(`scene ${scene.sceneId}: image object not found`);
    return;
  }

  if (!isImageMime(meta.contentType)) {
    errors.push(
      `scene ${scene.sceneId}: image content-type invalid (${meta.contentType ?? "unknown"})`,
    );
  }
};

const warnWhenNoVisualAsset = (
  scene: SceneRef,
  warnings: string[],
  job: JobMetaItem | null,
) => {
  if (job?.masterVideoS3Key?.trim()) {
    return;
  }
  if (!hasRenderableVisualAsset(scene)) {
    warnings.push(
      `scene ${scene.sceneId}: no imageS3Key or videoClipS3Key (renderer uses solid canvas)`,
    );
  }
};

const validateVoiceAsset = async (
  scene: SceneRef,
  errors: string[],
  warnings: string[],
) => {
  if (scene.disableNarration || !hasNarration(scene.narration)) {
    return;
  }
  if (!scene.voiceS3Key) {
    warnings.push(
      `scene ${scene.sceneId}: voiceS3Key missing with narration (renderer uses silence)`,
    );
    return;
  }

  const meta = await readObjectMetadata(scene.voiceS3Key);
  if (!meta.exists) {
    errors.push(`scene ${scene.sceneId}: voice object not found`);
    return;
  }

  if (!isAudioMime(meta.contentType)) {
    errors.push(
      `scene ${scene.sceneId}: voice content-type invalid (${meta.contentType ?? "unknown"})`,
    );
    return;
  }

  if (!meta.contentLength || meta.contentLength <= 0) {
    errors.push(`scene ${scene.sceneId}: voice object is empty`);
  }
};

const validateJobMasterVideo = async (
  job: JobMetaItem | null,
  errors: string[],
  warnings: string[],
) => {
  const key = job?.masterVideoS3Key?.trim();
  if (!key) {
    return;
  }
  const meta = await readObjectMetadata(key);
  if (!meta.exists) {
    errors.push("job master video object not found");
    return;
  }
  if (!isVideoOrJsonMime(meta.contentType)) {
    warnings.push(
      `job master video: uncommon content-type (${meta.contentType ?? "unknown"})`,
    );
  }
};

const validateVideoAsset = async (
  scene: SceneRef,
  errors: string[],
  warnings: string[],
  job: JobMetaItem | null,
) => {
  if (job?.masterVideoS3Key?.trim()) {
    return;
  }
  if (!scene.videoClipS3Key) {
    return;
  }

  const meta = await readObjectMetadata(scene.videoClipS3Key);
  if (!meta.exists) {
    errors.push(`scene ${scene.sceneId}: video object not found`);
    return;
  }

  if (!isVideoOrJsonMime(meta.contentType)) {
    warnings.push(
      `scene ${scene.sceneId}: video content-type uncommon (${meta.contentType ?? "unknown"})`,
    );
  }
};

const validateSceneAssets = async (
  sceneRefs: SceneRef[],
  errors: string[],
  warnings: string[],
  job: JobMetaItem | null,
) => {
  await validateJobMasterVideo(job, errors, warnings);
  for (const scene of sceneRefs) {
    validateSceneBasics(scene, errors, warnings);
    warnWhenNoVisualAsset(scene, warnings, job);
    await validateImageAsset(scene, errors);
    await validateVoiceAsset(scene, errors, warnings);
    await validateVideoAsset(scene, errors, warnings, job);
  }
};

const validateDurationAgainstTarget = (
  job: JobMetaItem | null,
  totalDurationSec: number,
  errors: string[],
  warnings: string[],
) => {
  if (!job) {
    errors.push("job metadata not found");
    return;
  }

  const target = job.targetDurationSec;
  const delta = Math.abs(totalDurationSec - target);
  if (delta > 15) {
    warnings.push(
      `total duration (${totalDurationSec}s) differs from target (${target}s) by ${delta}s`,
    );
  }
};

export const validateGeneratedAssets = async (input: ValidateInput) => {
  const { errors, warnings, sceneCount, sceneRefs } =
    createValidationContext(input);

  if (sceneCount === 0) {
    errors.push("scene count must be greater than 0");
  }

  const totalDurationSec = sceneRefs.reduce(
    (sum, scene) => sum + Math.max(0, scene.durationSec),
    0,
  );
  if (totalDurationSec <= 0) {
    errors.push("total scene duration must be greater than 0");
  }

  await validateSceneAssets(sceneRefs, errors, warnings, input.job);
  validateDurationAgainstTarget(input.job, totalDurationSec, errors, warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    sceneCount,
    totalDurationSec,
    checkedAt: new Date().toISOString(),
    topicReady: Boolean(input.job),
  };
};
