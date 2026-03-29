import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseUpdateSceneJsonArgs } from "./normalize/parse-update-scene-json-args";
import { updateAdminSceneJson } from "./usecase/update-scene-json";

export const run = runAuditedAdminResolver({
  operation: "updateSceneJson",
  operationType: "mutation",
  parse: parseUpdateSceneJsonArgs,
  resolveAuditFields: ({ parsed }) => ({
    jobId: parsed?.jobId,
  }),
  run: async ({ parsed }) => updateAdminSceneJson(parsed),
});
