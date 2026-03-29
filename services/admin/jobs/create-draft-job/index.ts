import { resolveJobIdAuditFields } from "../../shared/resolver-audit-fields";
import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseCreateDraftJobArgs } from "./normalize/parse-create-draft-job-args";
import { createAdminDraftJob } from "./usecase/create-draft-job";

export const run = runAuditedAdminResolver({
  operation: "createDraftJob",
  operationType: "mutation",
  parse: parseCreateDraftJobArgs,
  resolveAuditFields: resolveJobIdAuditFields(),
  run: async ({ parsed, actor }) =>
    createAdminDraftJob({ ...parsed, triggeredBy: actor }),
});
