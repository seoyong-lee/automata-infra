import { resolveJobIdAuditFields } from "../../shared/resolver-audit-fields";
import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { handleRunSceneJsonCatch } from "../run-scene-json/handle-run-scene-json-error";
import { parseRunSourceVideoSceneJsonArgs } from "./normalize/parse-run-source-video-scene-json-args";
import { runAdminSourceVideoSceneJson } from "./usecase/run-source-video-scene-json";

export const run = runAuditedAdminResolver({
  operation: "runSourceVideoSceneJson",
  operationType: "mutation",
  parse: parseRunSourceVideoSceneJsonArgs,
  resolveAuditFields: resolveJobIdAuditFields(),
  onError: ({ error, actor, parsed }) =>
    handleRunSceneJsonCatch(
      error,
      actor,
      parsed?.jobId,
      "runSourceVideoSceneJson",
    ),
  run: async ({ parsed, actor }) =>
    runAdminSourceVideoSceneJson(parsed, actor),
});
