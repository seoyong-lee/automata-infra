import { resolveJobIdAuditFields } from "../../shared/resolver-audit-fields";
import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseSetJobBackgroundMusicArgs } from "./normalize/parse-set-job-background-music-args";
import { setJobBackgroundMusic } from "./usecase/set-job-background-music";

export const run = runAuditedAdminResolver({
  operation: "setJobBackgroundMusic",
  operationType: "mutation",
  parse: parseSetJobBackgroundMusicArgs,
  resolveAuditFields: resolveJobIdAuditFields(),
  run: async ({ parsed }) => setJobBackgroundMusic(parsed),
});
