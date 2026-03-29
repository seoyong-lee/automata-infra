import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseJobTimelineArgs } from "./normalize/parse-job-timeline-args";
import { getJobTimeline } from "./usecase/get-job-timeline";

export const run = runAuditedAdminResolver({
  operation: "jobTimeline",
  operationType: "query",
  parse: parseJobTimelineArgs,
  resolveAuditFields: ({ parsed }) => ({
    jobId: parsed?.jobId,
  }),
  run: async ({ parsed }) => getJobTimeline(parsed.jobId),
});
