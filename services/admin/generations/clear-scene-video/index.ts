import { resolveJobIdAuditFields } from "../../shared/resolver-audit-fields";
import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseClearSceneVideoArgs } from "./normalize/parse-clear-scene-video-args";
import { clearSceneVideo } from "./usecase/clear-scene-video";

export const run = runAuditedAdminResolver({
  operation: "clearSceneVideo",
  operationType: "mutation",
  parse: parseClearSceneVideoArgs,
  resolveAuditFields: resolveJobIdAuditFields(),
  run: async ({ parsed }) => clearSceneVideo(parsed),
});
