import { resolveJobIdAuditFields } from "../../shared/resolver-audit-fields";
import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseSelectRenderArtifactArgs } from "./normalize/parse-select-render-artifact-args";
import { selectRenderArtifactUsecase } from "./usecase/select-render-artifact";

export const run = runAuditedAdminResolver({
  operation: "selectRenderArtifact",
  operationType: "mutation",
  parse: parseSelectRenderArtifactArgs,
  resolveAuditFields: resolveJobIdAuditFields(),
  run: async ({ parsed }) => selectRenderArtifactUsecase(parsed),
});
