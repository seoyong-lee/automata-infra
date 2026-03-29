import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseSetJobBackgroundMusicArgs } from "./normalize/parse-set-job-background-music-args";
import { setJobBackgroundMusic } from "./usecase/set-job-background-music";

export const run = runAuditedAdminResolver({
  operation: "setJobBackgroundMusic",
  operationType: "mutation",
  parse: parseSetJobBackgroundMusicArgs,
  resolveAuditFields: ({ parsed }) => ({
    jobId: parsed?.jobId,
  }),
  run: async ({ parsed }) => setJobBackgroundMusic(parsed),
});
