import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { getLlmSettings } from "./usecase/get-llm-settings";

export const run = runAuditedAdminResolver({
  operation: "llmSettings",
  operationType: "query",
  parse: () => undefined,
  run: async () => getLlmSettings(),
});
