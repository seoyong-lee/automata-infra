import { headObjectFromS3 } from "../../../../shared/lib/aws/runtime-s3";
import type { RegisterAssetPoolAssetInput } from "../../../../shared/lib/contracts/admin-asset-pool";
import type { AssetPoolAssetType } from "../../../../shared/lib/contracts/asset-pool";
import {
  buildAssetPoolItem,
  putAssetPoolItem,
} from "../../../../shared/lib/store/asset-pool";
import { mapAssetPoolItemToDto } from "../../../shared/mapper/map-asset-pool-item";
import { badUserInput } from "../../../shared/errors";
import type { AssetPoolAssetDto } from "../../../shared/types";

const assertContentTypeMatches = (
  assetType: AssetPoolAssetType,
  contentType?: string,
): void => {
  if (!contentType) {
    return;
  }
  const expectedPrefix = assetType === "image" ? "image/" : "video/";
  if (!contentType.toLowerCase().startsWith(expectedPrefix)) {
    throw badUserInput(
      `storageKey must point to a ${expectedPrefix}* object for ${assetType} assets`,
    );
  }
};

const assertImageContentType = (contentType?: string): void => {
  if (!contentType) {
    return;
  }
  if (!contentType.toLowerCase().startsWith("image/")) {
    throw badUserInput("thumbnailKey must point to an image/* object");
  }
};

const requireExistingObject = async (
  key: string,
): Promise<string | undefined> => {
  const result = await headObjectFromS3(key);
  if (!result.exists) {
    throw badUserInput(`asset object not found for key: ${key}`);
  }
  return result.contentType;
};

const resolveThumbnailKey = (
  input: RegisterAssetPoolAssetInput,
): string | undefined => {
  if (input.thumbnailKey) {
    return input.thumbnailKey;
  }
  return input.assetType === "image" ? input.storageKey : undefined;
};

export const registerAssetPoolAsset = async (
  input: RegisterAssetPoolAssetInput,
): Promise<AssetPoolAssetDto> => {
  const thumbnailKey = resolveThumbnailKey(input);
  const storageContentType = await requireExistingObject(input.storageKey);
  assertContentTypeMatches(input.assetType, storageContentType);

  if (thumbnailKey && thumbnailKey !== input.storageKey) {
    const thumbnailContentType = await requireExistingObject(thumbnailKey);
    assertImageContentType(thumbnailContentType);
  } else if (thumbnailKey) {
    assertImageContentType(storageContentType);
  }

  const item = await putAssetPoolItem({
    item: buildAssetPoolItem({
      ...input,
      thumbnailKey,
    }),
  });

  return mapAssetPoolItemToDto({
    ...item,
    matchedTags: [],
    matchedTagCount: 0,
  });
};
