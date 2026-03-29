import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseDeleteContentArgs } from "./normalize/parse-delete-content-args";
import { deleteAdminContent } from "./usecase/delete-content";

export const run = runAuditedAdminResolver({
  operation: "deleteContent",
  operationType: "mutation",
  parse: parseDeleteContentArgs,
  resolveAuditFields: ({ parsed, result }) => {
    const resolved = result as
      | Awaited<ReturnType<typeof deleteAdminContent>>
      | undefined;
    return {
      action: resolved?.contentId ?? parsed?.contentId,
    };
  },
  run: async ({ parsed }) => deleteAdminContent(parsed),
});
