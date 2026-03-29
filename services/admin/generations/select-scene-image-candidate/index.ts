import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseSelectSceneImageCandidateArgs } from "./normalize/parse-select-scene-image-candidate-args";
import { selectSceneImageCandidateUsecase } from "./usecase/select-scene-image-candidate";

export const run = runAuditedAdminResolver({
  operation: "selectSceneImageCandidate",
  operationType: "mutation",
  parse: parseSelectSceneImageCandidateArgs,
  resolveAuditFields: ({ parsed }) => ({
    jobId: parsed?.jobId,
  }),
  run: async ({ parsed }) => selectSceneImageCandidateUsecase(parsed),
});
