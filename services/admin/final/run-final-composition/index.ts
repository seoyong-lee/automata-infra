import { resolveJobIdAuditFields } from "../../shared/resolver-audit-fields";
import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseRunFinalCompositionArgs } from "./normalize/parse-run-final-composition-args";
import { runAdminFinalComposition } from "./usecase/run-final-composition";

export const run = runAuditedAdminResolver({
  operation: "runFinalComposition",
  operationType: "mutation",
  parse: parseRunFinalCompositionArgs,
  resolveAuditFields: resolveJobIdAuditFields(),
  run: async ({ parsed, actor }) =>
    runAdminFinalComposition(parsed.jobId, actor, {
      burnInSubtitles: parsed.burnInSubtitles,
    }),
});
