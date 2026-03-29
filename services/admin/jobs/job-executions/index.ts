import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseJobExecutionsArgs } from "./normalize/parse-job-executions-args";
import { getAdminJobExecutions } from "./usecase/get-job-executions";

export const run = runAuditedAdminResolver({
  operation: "jobExecutions",
  operationType: "query",
  parse: parseJobExecutionsArgs,
  resolveAuditFields: ({ parsed }) => ({
    jobId: parsed?.jobId,
  }),
  run: async ({ parsed }) => getAdminJobExecutions(parsed.jobId),
});
