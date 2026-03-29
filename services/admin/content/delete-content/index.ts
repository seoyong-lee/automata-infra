import { combineResolverAuditFields, resolveActionAuditFields } from "../../shared/resolver-audit-fields";
import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseDeleteContentArgs } from "./normalize/parse-delete-content-args";
import { deleteAdminContent } from "./usecase/delete-content";

export const run = runAuditedAdminResolver({
  operation: "deleteContent",
  operationType: "mutation",
  parse: parseDeleteContentArgs,
  resolveAuditFields: combineResolverAuditFields(
    resolveActionAuditFields({
      parsedPath: "contentId",
      resultPath: "contentId",
    }),
  ),
  run: async ({ parsed }) => deleteAdminContent(parsed),
});
