import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseListContentsArgs } from "./normalize/parse-list-contents-args";
import { listContentsUsecase } from "./usecase/list-contents";

export const run = runAuditedAdminResolver({
  operation: "adminContents",
  operationType: "query",
  parse: parseListContentsArgs,
  run: async ({ parsed }) => listContentsUsecase(parsed),
});
