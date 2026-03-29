import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseDeleteContentPresetArgs } from "./normalize/parse-delete-content-preset-args";
import { deleteContentPreset } from "./usecase/delete-content-preset";

export const run = runAuditedAdminResolver({
  operation: "deleteContentPreset",
  operationType: "mutation",
  parse: parseDeleteContentPresetArgs,
  resolveAuditFields: ({ parsed }) => ({
    action: parsed?.presetId,
  }),
  run: async ({ parsed }) => deleteContentPreset(parsed.presetId),
});
