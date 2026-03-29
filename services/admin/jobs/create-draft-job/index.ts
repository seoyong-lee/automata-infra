import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseCreateDraftJobArgs } from "./normalize/parse-create-draft-job-args";
import { createAdminDraftJob } from "./usecase/create-draft-job";

export const run = runAuditedAdminResolver({
  operation: "createDraftJob",
  operationType: "mutation",
  parse: parseCreateDraftJobArgs,
  resolveAuditFields: ({ result }) => {
    const resolved = result as
      | Awaited<ReturnType<typeof createAdminDraftJob>>
      | undefined;
    return {
      jobId: resolved?.jobId,
    };
  },
  run: async ({ parsed, actor }) =>
    createAdminDraftJob({ ...parsed, triggeredBy: actor }),
});
