import { resolveJobIdAuditFields } from "../../shared/resolver-audit-fields";
import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseGetJobArgs } from "./normalize/parse-get-job-args";
import { getAdminJob } from "./usecase/get-admin-job";

export const run = runAuditedAdminResolver({
  operation: "adminJob",
  operationType: "query",
  parse: parseGetJobArgs,
  resolveAuditFields: resolveJobIdAuditFields(),
  run: async ({ parsed }) => getAdminJob(parsed.jobId),
});
