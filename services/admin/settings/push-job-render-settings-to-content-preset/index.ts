import {
  combineResolverAuditFields,
  resolveActionAuditFields,
  resolveJobIdAuditFields,
} from "../../shared/resolver-audit-fields";
import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parsePushJobRenderSettingsToContentPresetArgs } from "./normalize/parse-push-job-render-settings-to-content-preset-args";
import { pushJobRenderSettingsToContentPreset } from "./usecase/push-job-render-settings-to-content-preset";

export const run = runAuditedAdminResolver({
  operation: "pushJobRenderSettingsToContentPreset",
  operationType: "mutation",
  parse: parsePushJobRenderSettingsToContentPresetArgs,
  resolveAuditFields: combineResolverAuditFields(
    resolveJobIdAuditFields({ parsedPath: "jobId" }),
    resolveActionAuditFields({ resultPath: "presetId" }),
  ),
  run: async ({ parsed }) => pushJobRenderSettingsToContentPreset(parsed),
});
