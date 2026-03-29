import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseSetSceneVoiceProfileArgs } from "./normalize/parse-set-scene-voice-profile-args";
import { setSceneVoiceProfile } from "./usecase/set-scene-voice-profile";

export const run = runAuditedAdminResolver({
  operation: "setSceneVoiceProfile",
  operationType: "mutation",
  parse: parseSetSceneVoiceProfileArgs,
  resolveAuditFields: ({ parsed }) => ({
    jobId: parsed?.jobId,
    action:
      typeof parsed?.sceneId === "number" ? String(parsed.sceneId) : undefined,
  }),
  run: async ({ parsed }) => setSceneVoiceProfile(parsed),
});
