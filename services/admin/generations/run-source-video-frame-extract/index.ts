import { resolveJobIdAuditFields } from "../../shared/resolver-audit-fields";
import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseRunSourceVideoFrameExtractArgs } from "./normalize/parse-run-source-video-frame-extract-args";
import { runSourceVideoFrameExtract } from "./usecase/run-source-video-frame-extract";

export const run = runAuditedAdminResolver({
  operation: "runSourceVideoFrameExtract",
  operationType: "mutation",
  parse: parseRunSourceVideoFrameExtractArgs,
  resolveAuditFields: resolveJobIdAuditFields(),
  run: async ({ parsed }) => runSourceVideoFrameExtract(parsed),
});
