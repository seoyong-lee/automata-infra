import { resolveJobIdAuditFields } from "../../shared/resolver-audit-fields";
import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseGetJobDraftArgs } from "./normalize/parse-get-job-draft-args";
import { getAdminJobDraft } from "./usecase/get-job-draft";

export const run = runAuditedAdminResolver({
  operation: "jobDraft",
  operationType: "query",
  parse: parseGetJobDraftArgs,
  resolveAuditFields: resolveJobIdAuditFields(),
  run: async ({ parsed }) => getAdminJobDraft(parsed.jobId),
});
