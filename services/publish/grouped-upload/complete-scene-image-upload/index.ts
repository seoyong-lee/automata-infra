import { resolveJobIdAuditFields } from "../../../admin/shared/resolver-audit-fields";
import { runAuditedAdminResolver } from "../../../admin/shared/run-audited-admin-resolver";
import { parseCompleteSceneImageUploadArgs } from "./normalize/parse-complete-scene-image-upload-args";
import { completeSceneImageUpload } from "./usecase/complete-scene-image-upload";

export const run = runAuditedAdminResolver({
  operation: "completeSceneImageUpload",
  operationType: "mutation",
  parse: parseCompleteSceneImageUploadArgs,
  resolveAuditFields: resolveJobIdAuditFields(),
  run: async ({ parsed }) => completeSceneImageUpload(parsed),
});
