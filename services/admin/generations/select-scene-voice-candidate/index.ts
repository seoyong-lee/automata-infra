import { resolveJobIdAuditFields } from "../../shared/resolver-audit-fields";
import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseSelectSceneVoiceCandidateArgs } from "./normalize/parse-select-scene-voice-candidate-args";
import { selectSceneVoiceCandidateUsecase } from "./usecase/select-scene-voice-candidate";

export const run = runAuditedAdminResolver({
  operation: "selectSceneVoiceCandidate",
  operationType: "mutation",
  parse: parseSelectSceneVoiceCandidateArgs,
  resolveAuditFields: resolveJobIdAuditFields(),
  run: async ({ parsed }) => selectSceneVoiceCandidateUsecase(parsed),
});
