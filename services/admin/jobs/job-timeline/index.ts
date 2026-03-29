import { resolveJobIdAuditFields } from "../../shared/resolver-audit-fields";
import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseJobTimelineArgs } from "./normalize/parse-job-timeline-args";
import { getJobTimeline } from "./usecase/get-job-timeline";

export const run = runAuditedAdminResolver({
  operation: "jobTimeline",
  operationType: "query",
  parse: parseJobTimelineArgs,
  resolveAuditFields: resolveJobIdAuditFields(),
  run: async ({ parsed }) => getJobTimeline(parsed.jobId),
});
