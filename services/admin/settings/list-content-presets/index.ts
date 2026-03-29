import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseListContentPresetsArgs } from "./normalize/parse-list-content-presets-args";
import { listContentPresets } from "./usecase/list-content-presets";

export const run = runAuditedAdminResolver({
  operation: "contentPresets",
  operationType: "query",
  parse: parseListContentPresetsArgs,
  run: async ({ parsed }) => listContentPresets(parsed),
});
