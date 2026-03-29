import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseUpsertContentPresetArgs } from "./normalize/parse-upsert-content-preset-args";
import { upsertContentPreset } from "./usecase/upsert-content-preset";

export const run = runAuditedAdminResolver({
  operation: "upsertContentPreset",
  operationType: "mutation",
  parse: parseUpsertContentPresetArgs,
  resolveAuditFields: ({ parsed }) => ({
    action: parsed?.presetId,
  }),
  run: async ({ parsed }) => upsertContentPreset(parsed),
});
