import { combineResolverAuditFields, resolveActionAuditFields } from "../../shared/resolver-audit-fields";
import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseUpdateContentArgs } from "./normalize/parse-update-content-args";
import { updateAdminContent } from "./usecase/update-content";

export const run = runAuditedAdminResolver({
  operation: "updateContent",
  operationType: "mutation",
  parse: parseUpdateContentArgs,
  resolveAuditFields: combineResolverAuditFields(
    resolveActionAuditFields({
      parsedPath: "draft.contentId",
      resultPath: "contentId",
    }),
  ),
  run: async ({ parsed, actor }) => updateAdminContent({ ...parsed, actor }),
});
