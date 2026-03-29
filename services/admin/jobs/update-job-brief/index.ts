import { resolveJobIdAuditFields } from "../../shared/resolver-audit-fields";
import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseUpdateJobBriefArgs } from "./normalize/parse-update-job-brief-args";
import { updateAdminJobBrief } from "./usecase/update-job-brief";

export const run = runAuditedAdminResolver({
  operation: "updateJobBrief",
  operationType: "mutation",
  parse: parseUpdateJobBriefArgs,
  resolveAuditFields: resolveJobIdAuditFields(),
  run: async ({ parsed }) => updateAdminJobBrief(parsed),
});
