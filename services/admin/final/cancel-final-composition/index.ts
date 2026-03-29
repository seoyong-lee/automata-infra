import { resolveJobIdAuditFields } from "../../shared/resolver-audit-fields";
import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseCancelFinalCompositionArgs } from "./normalize/parse-cancel-final-composition-args";
import { cancelFinalCompositionUsecase } from "./usecase/cancel-final-composition";

export const run = runAuditedAdminResolver({
  operation: "cancelFinalComposition",
  operationType: "mutation",
  parse: parseCancelFinalCompositionArgs,
  resolveAuditFields: resolveJobIdAuditFields(),
  run: async ({ parsed, actor }) =>
    cancelFinalCompositionUsecase(parsed, actor),
});
