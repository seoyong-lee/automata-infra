import {
  putSceneImageCandidate,
  upsertSceneAsset,
  updateJobMeta,
} from "../../shared/lib/store/video-jobs";
import { mapGeneratedImageFields } from "../mapper/map-generated-image-fields";

const asRecord = (asset: unknown): Record<string, unknown> =>
  asset && typeof asset === "object" ? (asset as Record<string, unknown>) : {};

const resolveSceneId = (
  typedAsset: Record<string, unknown>,
  sceneId?: number,
): number | undefined =>
  typeof typedAsset.sceneId === "number" ? typedAsset.sceneId : sceneId;

const persistImageCandidate = async (
  jobId: string,
  sceneId: number,
  typedAsset: Record<string, unknown>,
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
  scenes: Array<{ sceneId: number }>;
  imageAssets: unknown[];
  markStatus?: boolean;
}): Promise<void> => {
  for (const [index, asset] of input.imageAssets.entries()) {
    const typedAsset = asRecord(asset);
    const sceneId = resolveSceneId(typedAsset, input.scenes[index]?.sceneId);
    if (typeof sceneId === "number") {
      const patch = mapGeneratedImageFields(typedAsset, sceneId);
      await persistImageCandidate(input.jobId, sceneId, typedAsset);
      await upsertSceneAsset(input.jobId, sceneId, patch);
    }
  }

  if (input.markStatus ?? true) {
    await updateJobMeta(input.jobId, {}, "ASSET_GENERATING");
  }
};
