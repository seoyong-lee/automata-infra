import { buildPreviewAssetUrl } from "../../../shared/lib/asset-url";
import type { AssetPoolSearchHit } from "../../../shared/lib/store/asset-pool";
import type { AssetPoolAssetDto } from "../types";

const resolveThumbnailKey = (item: AssetPoolSearchHit): string | undefined => {
  if (item.thumbnailKey) {
    return item.thumbnailKey;
  }
  return item.assetType === "image" ? item.storageKey : undefined;
};

export const mapAssetPoolItemToDto = (
  item: AssetPoolSearchHit,
): AssetPoolAssetDto => {
  const thumbnailKey = resolveThumbnailKey(item);
  return {
    assetId: item.assetId,
    assetType: item.assetType,
    sourceType: item.sourceType,
    provider: item.provider,
    storageKey: item.storageKey,
    storageUrl: buildPreviewAssetUrl(item.storageKey),
    thumbnailKey,
    thumbnailUrl: buildPreviewAssetUrl(thumbnailKey),
    sourceUrl: item.sourceUrl,
    durationSec: item.durationSec,
    width: item.width,
    height: item.height,
    visualTags: item.visualTags,
    moodTags: item.moodTags,
    matchedTags: item.matchedTags,
    matchedTagCount: item.matchedTagCount,
    containsPeople: item.containsPeople,
    containsLogo: item.containsLogo,
    containsText: item.containsText,
    containsWatermark: item.containsWatermark,
    qualityScore: item.qualityScore,
    reusabilityScore: item.reusabilityScore,
    licenseType: item.licenseType,
    creatorName: item.creatorName,
    attributionRequired: item.attributionRequired,
    commercialUseAllowed: item.commercialUseAllowed,
    reviewStatus: item.reviewStatus,
    ingestedAt: item.ingestedAt,
    updatedAt: item.updatedAt,
  };
};
