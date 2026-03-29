import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseCreateContentArgs } from "./normalize/parse-create-content-args";
import { createAdminContent } from "./usecase/create-content";

export const run = runAuditedAdminResolver({
  operation: "createContent",
  operationType: "mutation",
  parse: parseCreateContentArgs,
  resolveAuditFields: ({ result }) => {
    const resolved = result as
      | Awaited<ReturnType<typeof createAdminContent>>
      | undefined;
    return {
      action: resolved?.contentId,
    };
  },
  run: async ({ parsed, actor }) => createAdminContent({ ...parsed, actor }),
});
