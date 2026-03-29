import {
  putSceneImageCandidate,
  putSceneVideoCandidate,
} from "../../../../shared/lib/store/video-jobs";

const asString = (value: unknown): string | undefined => {
  return typeof value === "string" ? value : undefined;
};

const asBoolean = (value: unknown): boolean | undefined => {
  return typeof value === "boolean" ? value : undefined;
};

const asNumber = (value: unknown): number | undefined => {
  return typeof value === "number" ? value : undefined;
};

export const persistStockImageCandidates = async (
  jobId: string,
  sceneId: number,
  assets: Record<string, unknown>[],
): Promise<void> => {
  for (const asset of assets) {
    const candidateId = asString(asset.candidateId);
    if (!candidateId) {
      continue;
    }
    await putSceneImageCandidate(jobId, sceneId, candidateId, {
      imageS3Key: asString(asset.imageS3Key),
      createdAt: asString(asset.createdAt) ?? new Date().toISOString(),
      provider: asString(asset.provider),
      providerLogS3Key: asString(asset.providerLogS3Key),
      promptHash: asString(asset.promptHash),
      mocked: asBoolean(asset.mocked),
      sourceUrl: asString(asset.sourceUrl),
      thumbnailUrl: asString(asset.thumbnailUrl),
      authorName: asString(asset.authorName),
      sourceAssetId: asString(asset.sourceAssetId),
      width: asNumber(asset.width),
      height: asNumber(asset.height),
    });
  }
};

export const persistStockVideoCandidates = async (
  jobId: string,
  sceneId: number,
  assets: Record<string, unknown>[],
): Promise<void> => {
  for (const asset of assets) {
    const candidateId = asString(asset.candidateId);
    if (!candidateId) {
      continue;
    }
    await putSceneVideoCandidate(jobId, sceneId, candidateId, {
      videoClipS3Key: asString(asset.videoClipS3Key),
      createdAt: asString(asset.createdAt) ?? new Date().toISOString(),
      provider: asString(asset.provider),
      providerLogS3Key: asString(asset.providerLogS3Key),
      promptHash: asString(asset.promptHash),
      mocked: asBoolean(asset.mocked),
      sourceUrl: asString(asset.sourceUrl),
      thumbnailUrl: asString(asset.thumbnailUrl),
      authorName: asString(asset.authorName),
      sourceAssetId: asString(asset.sourceAssetId),
      width: asNumber(asset.width),
      height: asNumber(asset.height),
      durationSec: asNumber(asset.durationSec),
    });
  }
};
