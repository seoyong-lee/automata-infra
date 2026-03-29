import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseSetJobDefaultVoiceProfileArgs } from "./normalize/parse-set-job-default-voice-profile-args";
import { setJobDefaultVoiceProfile } from "./usecase/set-job-default-voice-profile";

export const run = runAuditedAdminResolver({
  operation: "setJobDefaultVoiceProfile",
  operationType: "mutation",
  parse: parseSetJobDefaultVoiceProfileArgs,
  resolveAuditFields: ({ parsed }) => ({
    jobId: parsed?.jobId,
  }),
  run: async ({ parsed }) => setJobDefaultVoiceProfile(parsed),
});
