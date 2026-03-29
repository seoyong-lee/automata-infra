import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseListJobsArgs } from "./normalize/parse-list-jobs-args";
import { listAdminJobs } from "./usecase/list-admin-jobs";

export const run = runAuditedAdminResolver({
  operation: "adminJobs",
  operationType: "query",
  parse: parseListJobsArgs,
  run: async ({ parsed }) => listAdminJobs(parsed),
});
