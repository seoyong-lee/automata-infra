import { resolveJobIdAuditFields } from "../../shared/resolver-audit-fields";
import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseDeleteJobArgs } from "./normalize/parse-delete-job-args";
import { deleteAdminJob } from "./usecase/delete-job";

export const run = runAuditedAdminResolver({
  operation: "deleteJob",
  operationType: "mutation",
  parse: parseDeleteJobArgs,
  resolveAuditFields: resolveJobIdAuditFields(),
  run: async ({ parsed }) => deleteAdminJob(parsed),
});
