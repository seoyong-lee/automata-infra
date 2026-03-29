import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { handleRunSceneJsonCatch } from "./handle-run-scene-json-error";
import { parseRunSceneJsonArgs } from "./normalize/parse-run-scene-json-args";
import { runAdminSceneJson } from "./usecase/run-scene-json";

export const run = runAuditedAdminResolver({
  operation: "runSceneJson",
  operationType: "mutation",
  parse: parseRunSceneJsonArgs,
  resolveAuditFields: ({ parsed }) => ({
    jobId: parsed?.jobId,
  }),
  onError: ({ error, actor, parsed }) =>
    handleRunSceneJsonCatch(error, actor, parsed?.jobId),
  run: async ({ parsed, actor }) => runAdminSceneJson(parsed.jobId, actor),
});
