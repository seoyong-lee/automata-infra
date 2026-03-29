import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseRunFinalCompositionArgs } from "./normalize/parse-run-final-composition-args";
import { runAdminFinalComposition } from "./usecase/run-final-composition";

export const run = runAuditedAdminResolver({
  operation: "runFinalComposition",
  operationType: "mutation",
  parse: parseRunFinalCompositionArgs,
  resolveAuditFields: ({ parsed }) => ({
    jobId: parsed?.jobId,
  }),
  run: async ({ parsed, actor }) =>
    runAdminFinalComposition(parsed.jobId, actor, {
      burnInSubtitles: parsed.burnInSubtitles,
    }),
});
