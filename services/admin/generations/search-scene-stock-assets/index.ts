import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseSearchSceneStockAssetsArgs } from "./normalize/parse-search-scene-stock-assets-args";
import { searchSceneStockAssetsUsecase } from "./usecase/search-scene-stock-assets";

export const run = runAuditedAdminResolver({
  operation: "searchSceneStockAssets",
  operationType: "mutation",
  parse: parseSearchSceneStockAssetsArgs,
  resolveAuditFields: ({ parsed }) => ({
    jobId: parsed?.jobId,
  }),
  run: async ({ parsed }) => searchSceneStockAssetsUsecase(parsed),
});
