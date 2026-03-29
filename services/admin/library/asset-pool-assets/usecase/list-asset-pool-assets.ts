import type { ListAssetPoolAssetsArgs } from "../../../../shared/lib/contracts/admin-asset-pool";
import { listAssetPoolItems } from "../../../../shared/lib/store/asset-pool";
import { mapAssetPoolItemToDto } from "../../../shared/mapper/map-asset-pool-item";
import type { AssetPoolAssetConnectionDto } from "../../../shared/types";

export const listAssetPoolAssets = async (
  input: ListAssetPoolAssetsArgs,
): Promise<AssetPoolAssetConnectionDto> => {
  const page = await listAssetPoolItems(input);
  return {
    items: page.items.map(mapAssetPoolItemToDto),
    nextToken: page.nextToken,
  };
};
