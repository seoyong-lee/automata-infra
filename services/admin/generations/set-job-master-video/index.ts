import { resolveJobIdAuditFields } from "../../shared/resolver-audit-fields";
import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseSetJobMasterVideoArgs } from "./normalize/parse-set-job-master-video-args";
import { setJobMasterVideo } from "./usecase/set-job-master-video";

export const run = runAuditedAdminResolver({
  operation: "setJobMasterVideo",
  operationType: "mutation",
  parse: parseSetJobMasterVideoArgs,
  resolveAuditFields: resolveJobIdAuditFields(),
  run: async ({ parsed }) => setJobMasterVideo(parsed),
});
