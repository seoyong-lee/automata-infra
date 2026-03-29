import { upsertSceneAsset } from "../../shared/lib/store/video-jobs";
import { registerSceneAssetPoolItem } from "../../shared/lib/asset-pool-ingest";
import type { SceneDefinition } from "../../../types/render/scene-json";
import { mapGeneratedVideoFields } from "../mapper/map-generated-video-fields";

const asRecord = (asset: unknown): Record<string, unknown> => {
  return asset && typeof asset === "object"
    ? (asset as Record<string, unknown>)
    : {};
};

const resolveSceneId = (
  typedAsset: Record<string, unknown>,
  scene?: Pick<SceneDefinition, "sceneId">,
): number | undefined => {
  return typeof typedAsset.sceneId === "number"
    ? typedAsset.sceneId
    : scene?.sceneId;
};

const resolveVideoClipS3Key = (
  typedAsset: Record<string, unknown>,
): string | undefined => {
  if (typeof typedAsset.videoClipS3Key === "string") {
    return typedAsset.videoClipS3Key;
  }
  if (typeof typedAsset.videoS3Key === "string") {
    return typedAsset.videoS3Key;
  }
  return undefined;
};

const registerVideoPoolAsset = async (input: {
  scene?: Pick<SceneDefinition, "sceneId"> & Partial<SceneDefinition>;
  typedAsset: Record<string, unknown>;
  videoClipS3Key?: string;
}) => {
  if (!input.scene || !input.videoClipS3Key) {
    return undefined;
  }
  return registerSceneAssetPoolItem({
    assetType: "video",
    sourceType: "ai",
    storageKey: input.videoClipS3Key,
    scene: input.scene,
    provider:
      typeof input.typedAsset.provider === "string"
        ? input.typedAsset.provider
        : undefined,
    durationSec:
      typeof input.typedAsset.resolvedDurationSec === "number"
        ? input.typedAsset.resolvedDurationSec
        : typeof input.typedAsset.targetDurationSec === "number"
          ? input.typedAsset.targetDurationSec
          : input.scene.durationSec,
    qualityScore: 0.62,
    reusabilityScore: 0.56,
  });
};

const buildVideoScenePatch = (input: {
  typedAsset: Record<string, unknown>;
  sceneId: number;
  assetPoolAssetId?: string;
}) => {
  return {
    ...mapGeneratedVideoFields(input.typedAsset, input.sceneId),
    ...(input.assetPoolAssetId
      ? {
          videoAssetId: input.assetPoolAssetId,
          videoSelectionSource: "ai",
        }
      : {}),
  };
};

export const saveVideoAssets = async (input: {
  jobId: string;
  scenes: Array<Pick<SceneDefinition, "sceneId"> & Partial<SceneDefinition>>;
  videoAssets: unknown[];
}): Promise<void> => {
  for (const [index, asset] of input.videoAssets.entries()) {
    const typedAsset = asRecord(asset);
    const scene = input.scenes[index];
    const sceneId = resolveSceneId(typedAsset, scene);
    if (typeof sceneId === "number") {
      const videoClipS3Key = resolveVideoClipS3Key(typedAsset);
      const assetPoolItem = await registerVideoPoolAsset({
        scene,
        typedAsset,
        videoClipS3Key,
      });
      const patch = buildVideoScenePatch({
        typedAsset,
        sceneId,
        assetPoolAssetId: assetPoolItem?.assetId,
      });
      await upsertSceneAsset(input.jobId, sceneId, patch);
    }
  }
};
