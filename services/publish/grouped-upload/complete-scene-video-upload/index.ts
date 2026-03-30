import { resolveJobIdAuditFields } from "../../../admin/shared/resolver-audit-fields";
import { runAuditedAdminResolver } from "../../../admin/shared/run-audited-admin-resolver";
import { parseCompleteSceneVideoUploadArgs } from "./normalize/parse-complete-scene-video-upload-args";
import { completeSceneVideoUpload } from "./usecase/complete-scene-video-upload";

export const run = runAuditedAdminResolver({
  operation: "completeSceneVideoUpload",
  operationType: "mutation",
  parse: parseCompleteSceneVideoUploadArgs,
  resolveAuditFields: resolveJobIdAuditFields(),
  run: async ({ parsed }) => completeSceneVideoUpload(parsed),
});
