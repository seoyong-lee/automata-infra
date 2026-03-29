import { resolveJobIdAuditFields } from "../../shared/resolver-audit-fields";
import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseSelectSceneVideoCandidateArgs } from "./normalize/parse-select-scene-video-candidate-args";
import { selectSceneVideoCandidateUsecase } from "./usecase/select-scene-video-candidate";

export const run = runAuditedAdminResolver({
  operation: "selectSceneVideoCandidate",
  operationType: "mutation",
  parse: parseSelectSceneVideoCandidateArgs,
  resolveAuditFields: resolveJobIdAuditFields(),
  run: async ({ parsed }) => selectSceneVideoCandidateUsecase(parsed),
});
