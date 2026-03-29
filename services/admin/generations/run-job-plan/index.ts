import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseRunJobPlanArgs } from "./normalize/parse-run-job-plan-args";
import { runAdminJobPlan } from "./usecase/run-job-plan";

export const run = runAuditedAdminResolver({
  operation: "runJobPlan",
  operationType: "mutation",
  parse: parseRunJobPlanArgs,
  resolveAuditFields: ({ parsed }) => ({
    jobId: parsed?.jobId,
  }),
  run: async ({ parsed, actor }) => runAdminJobPlan(parsed.jobId, actor),
});
