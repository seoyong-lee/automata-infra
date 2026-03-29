import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseUpdateLlmSettingsArgs } from "./normalize/parse-update-llm-settings-args";
import { updateAdminLlmStepSettings } from "./usecase/update-llm-step-settings";

export const run = runAuditedAdminResolver({
  operation: "updateLlmStepSettings",
  operationType: "mutation",
  parse: parseUpdateLlmSettingsArgs,
  resolveAuditFields: ({ parsed }) => ({
    action: parsed?.stepKey,
  }),
  run: async ({ parsed, actor }) =>
    updateAdminLlmStepSettings({
      ...parsed,
      actor,
    }),
});
