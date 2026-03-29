import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseDeleteJobArgs } from "./normalize/parse-delete-job-args";
import { deleteAdminJob } from "./usecase/delete-job";

export const run = runAuditedAdminResolver({
  operation: "deleteJob",
  operationType: "mutation",
  parse: parseDeleteJobArgs,
  resolveAuditFields: ({ parsed, result }) => {
    const resolved = result as
      | Awaited<ReturnType<typeof deleteAdminJob>>
      | undefined;
    return {
      jobId: resolved?.jobId ?? parsed?.jobId,
    };
  },
  run: async ({ parsed }) => deleteAdminJob(parsed),
});
