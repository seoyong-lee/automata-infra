import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseRegisterAssetPoolAssetArgs } from "./normalize/parse-register-asset-pool-asset-args";
import { registerAssetPoolAsset } from "./usecase/register-asset-pool-asset";

export const run = runAuditedAdminResolver({
  operation: "registerAssetPoolAsset",
  operationType: "mutation",
  parse: parseRegisterAssetPoolAssetArgs,
  run: async ({ parsed }) => registerAssetPoolAsset(parsed),
});
