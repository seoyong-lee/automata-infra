import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import {
  parseRunAssetGenerationArgs,
  type ParsedRunAssetGenerationArgs,
} from "./normalize/parse-run-asset-generation-args";
import { runAdminAssetGeneration } from "./usecase/run-asset-generation";

export const run = runAuditedAdminResolver({
  operation: "runAssetGeneration",
  operationType: "mutation",
  parse: (args): ParsedRunAssetGenerationArgs => parseRunAssetGenerationArgs(args),
  resolveAuditFields: ({ parsed }) => ({
    jobId: parsed?.jobId,
  }),
  run: async ({ parsed, actor }) => runAdminAssetGeneration(parsed, actor),
});
