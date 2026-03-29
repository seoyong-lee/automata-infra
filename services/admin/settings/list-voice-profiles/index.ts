import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { listVoiceProfiles } from "./usecase/list-voice-profiles";

export const run = runAuditedAdminResolver({
  operation: "voiceProfiles",
  operationType: "query",
  parse: () => undefined,
  run: async () => listVoiceProfiles(),
});
