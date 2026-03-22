import {
  putSceneImageCandidate,
  upsertSceneAsset,
  updateJobMeta,
} from "../../shared/lib/store/video-jobs";
import { mapGeneratedImageFields } from "../mapper/map-generated-image-fields";

export const saveImageAssets = async (input: {
  jobId: string;
  scenes: Array<{ sceneId: number }>;
  imageAssets: unknown[];
  markStatus?: boolean;
}): Promise<void> => {
  for (const [index, asset] of input.imageAssets.entries()) {
    const typedAsset =
      asset && typeof asset === "object"
        ? (asset as Record<string, unknown>)
        : {};
    const sceneId =
      typeof typedAsset.sceneId === "number"
        ? typedAsset.sceneId
        : input.scenes[index]?.sceneId;
    if (typeof sceneId === "number") {
      const patch = mapGeneratedImageFields(typedAsset, sceneId);
      const candidateId =
        typeof typedAsset.candidateId === "string"
          ? typedAsset.candidateId
          : undefined;
      const imageS3Key =
        typeof typedAsset.imageS3Key === "string"
          ? typedAsset.imageS3Key
          : undefined;
      const createdAt =
        typeof typedAsset.createdAt === "string"
          ? typedAsset.createdAt
          : new Date().toISOString();

      if (candidateId && imageS3Key) {
        await putSceneImageCandidate(input.jobId, sceneId, candidateId, {
          imageS3Key,
          createdAt,
          provider:
            typeof typedAsset.provider === "string"
              ? typedAsset.provider
              : undefined,
          providerLogS3Key:
            typeof typedAsset.providerLogS3Key === "string"
              ? typedAsset.providerLogS3Key
              : undefined,
          promptHash:
            typeof typedAsset.promptHash === "string"
              ? typedAsset.promptHash
              : undefined,
          mocked:
            typeof typedAsset.mocked === "boolean"
              ? typedAsset.mocked
              : undefined,
        });
      }
      await upsertSceneAsset(input.jobId, sceneId, patch);
    }
  }

  if (input.markStatus ?? true) {
    await updateJobMeta(input.jobId, {}, "ASSET_GENERATING");
  }
};
