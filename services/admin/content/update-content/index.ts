import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseUpdateContentArgs } from "./normalize/parse-update-content-args";
import { updateAdminContent } from "./usecase/update-content";

export const run = runAuditedAdminResolver({
  operation: "updateContent",
  operationType: "mutation",
  parse: parseUpdateContentArgs,
  resolveAuditFields: ({ parsed, result }) => {
    const resolved = result as
      | Awaited<ReturnType<typeof updateAdminContent>>
      | undefined;
    return {
      action: resolved?.contentId ?? parsed?.draft.contentId,
    };
  },
  run: async ({ parsed, actor }) => updateAdminContent({ ...parsed, actor }),
});
