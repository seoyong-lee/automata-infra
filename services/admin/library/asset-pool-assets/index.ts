import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseAssetPoolAssetsArgs } from "./normalize/parse-asset-pool-assets-args";
import { listAssetPoolAssets } from "./usecase/list-asset-pool-assets";

export const run = runAuditedAdminResolver({
  operation: "assetPoolAssets",
  operationType: "query",
  parse: parseAssetPoolAssetsArgs,
  run: async ({ parsed }) => listAssetPoolAssets(parsed),
});
