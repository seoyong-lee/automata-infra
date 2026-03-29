import { resolveJobIdAuditFields } from "../../shared/resolver-audit-fields";
import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseAttachJobToContentArgs } from "./normalize/parse-attach-job-to-content-args";
import { attachAdminJobToContent } from "./usecase/attach-job-to-content";

export const run = runAuditedAdminResolver({
  operation: "attachJobToContent",
  operationType: "mutation",
  parse: parseAttachJobToContentArgs,
  resolveAuditFields: resolveJobIdAuditFields(),
  run: async ({ parsed }) => attachAdminJobToContent(parsed),
});
