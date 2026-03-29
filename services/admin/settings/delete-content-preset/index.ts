import { resolveActionAuditFields } from "../../shared/resolver-audit-fields";
import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseDeleteContentPresetArgs } from "./normalize/parse-delete-content-preset-args";
import { deleteContentPreset } from "./usecase/delete-content-preset";

export const run = runAuditedAdminResolver({
  operation: "deleteContentPreset",
  operationType: "mutation",
  parse: parseDeleteContentPresetArgs,
  resolveAuditFields: resolveActionAuditFields({
    parsedPath: "presetId",
  }),
  run: async ({ parsed }) => deleteContentPreset(parsed.presetId),
});
