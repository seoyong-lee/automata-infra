import { resolveActionAuditFields } from "../../shared/resolver-audit-fields";
import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseCreateContentArgs } from "./normalize/parse-create-content-args";
import { createAdminContent } from "./usecase/create-content";

export const run = runAuditedAdminResolver({
  operation: "createContent",
  operationType: "mutation",
  parse: parseCreateContentArgs,
  resolveAuditFields: resolveActionAuditFields({
    resultPath: "contentId",
  }),
  run: async ({ parsed, actor }) => createAdminContent({ ...parsed, actor }),
});
