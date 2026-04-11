import {
  putSceneImageCandidate,
  upsertSceneAsset,
  updateJobMeta,
} from "../../shared/lib/store/video-jobs";
import { registerSceneAssetPoolItem } from "../../shared/lib/asset-pool-ingest";
import type { SceneDefinition } from "../../../types/render/scene-json";
import { mapGeneratedImageFields } from "../mapper/map-generated-image-fields";

const asRecord = (asset: unknown): Record<string, unknown> =>
  asset && typeof asset === "object" ? (asset as Record<string, unknown>) : {};

const resolveSceneId = (
  typedAsset: Record<string, unknown>,
  sceneIdFromOrder?: number,
): number | undefined => {
  const fromAsset = typedAsset.sceneId;
  if (typeof fromAsset === "number" && Number.isFinite(fromAsset)) {
    return fromAsset;
  }
  if (typeof fromAsset === "string") {
    const trimmed = fromAsset.trim();
    if (/^\d+$/.test(trimmed)) {
      const n = Number(trimmed);
      return Number.isFinite(n) ? n : undefined;
    }
  }
  return sceneIdFromOrder;
};

const persistImageCandidate = async (
  jobId: string,
  sceneId: number,
  typedAsset: Record<string, unknown>,
  assetPoolAssetId?: string,
) => {
  const candidateId =
    typeof typedAsset.candidateId === "string"
      ? typedAsset.candidateId
      : undefined;
  const imageS3Key =
    typeof typedAsset.imageS3Key === "string"
      ? typedAsset.imageS3Key
      : undefined;
  if (!candidateId || !imageS3Key) {
    return;
  }

  await putSceneImageCandidate(jobId, sceneId, candidateId, {
    imageS3Key,
    createdAt:
      typeof typedAsset.createdAt === "string"
        ? typedAsset.createdAt
        : new Date().toISOString(),
    candidateSource: "ai",
    assetPoolAssetId,
    provider:
      typeof typedAsset.provider === "string" ? typedAsset.provider : undefined,
    providerLogS3Key:
      typeof typedAsset.providerLogS3Key === "string"
        ? typedAsset.providerLogS3Key
        : undefined,
    promptHash:
      typeof typedAsset.promptHash === "string"
        ? typedAsset.promptHash
        : undefined,
    mocked:
      typeof typedAsset.mocked === "boolean" ? typedAsset.mocked : undefined,
  });
};

export const saveImageAssets = async (input: {
  jobId: string;
  scenes: Array<
    Pick<SceneDefinition, "sceneId" | "imagePrompt"> & Partial<SceneDefinition>
  >;
  imageAssets: unknown[];
  markStatus?: boolean;
}): Promise<void> => {
  for (const [index, asset] of input.imageAssets.entries()) {
    const typedAsset = asRecord(asset);
    const scene = input.scenes[index];
    const sceneId = resolveSceneId(typedAsset, scene?.sceneId);
    if (typeof sceneId === "number") {
      const imageS3Key =
        typeof typedAsset.imageS3Key === "string"
          ? typedAsset.imageS3Key
          : undefined;
      const assetPoolItem =
        scene && imageS3Key
          ? await registerSceneAssetPoolItem({
              assetType: "image",
              sourceType: "ai",
              storageKey: imageS3Key,
              scene,
              provider:
                typeof typedAsset.provider === "string"
                  ? typedAsset.provider
                  : undefined,
              width:
                typeof typedAsset.width === "number"
                  ? typedAsset.width
                  : undefined,
              height:
                typeof typedAsset.height === "number"
                  ? typedAsset.height
                  : undefined,
              qualityScore: 0.62,
              reusabilityScore: 0.58,
            })
          : undefined;
      const patch = {
        ...mapGeneratedImageFields(typedAsset, sceneId),
        ...(assetPoolItem
          ? {
              imageAssetId: assetPoolItem.assetId,
              imageSelectionSource: "ai",
            }
          : {}),
      };
      await persistImageCandidate(
        input.jobId,
        sceneId,
        typedAsset,
        assetPoolItem?.assetId,
      );
      await upsertSceneAsset(input.jobId, sceneId, patch);
    }
  }

  if (input.markStatus ?? true) {
    await updateJobMeta(input.jobId, {}, "ASSET_GENERATING");
  }
};
