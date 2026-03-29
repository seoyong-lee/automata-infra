import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseUpsertVoiceProfileArgs } from "./normalize/parse-upsert-voice-profile-args";
import { upsertVoiceProfile } from "./usecase/upsert-voice-profile";

export const run = runAuditedAdminResolver({
  operation: "upsertVoiceProfile",
  operationType: "mutation",
  parse: parseUpsertVoiceProfileArgs,
  resolveAuditFields: ({ parsed }) => ({
    action: parsed?.profileId,
  }),
  run: async ({ parsed, actor }) =>
    upsertVoiceProfile({
      ...parsed,
      actor,
    }),
});
