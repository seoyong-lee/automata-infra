import { parseListAssetPoolAssetsArgs } from "../../../../shared/lib/contracts/admin-asset-pool";
import { badUserInput } from "../../../shared/errors";

export const parseAssetPoolAssetsArgs = (args: Record<string, unknown>) => {
  try {
    return parseListAssetPoolAssetsArgs(args);
  } catch {
    throw badUserInput("assetPoolAssets args are invalid");
  }
};
