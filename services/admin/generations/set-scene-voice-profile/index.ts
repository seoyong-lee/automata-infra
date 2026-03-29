import { combineResolverAuditFields, resolveActionAuditFields, resolveJobIdAuditFields } from "../../shared/resolver-audit-fields";
import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseSetSceneVoiceProfileArgs } from "./normalize/parse-set-scene-voice-profile-args";
import { setSceneVoiceProfile } from "./usecase/set-scene-voice-profile";

export const run = runAuditedAdminResolver({
  operation: "setSceneVoiceProfile",
  operationType: "mutation",
  parse: parseSetSceneVoiceProfileArgs,
  resolveAuditFields: combineResolverAuditFields(
    resolveJobIdAuditFields(),
    resolveActionAuditFields({
      parsedPath: "sceneId",
    }),
  ),
  run: async ({ parsed }) => setSceneVoiceProfile(parsed),
});
