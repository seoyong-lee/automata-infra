import { resolveJobIdAuditFields } from "../../../admin/shared/resolver-audit-fields";
import { runAuditedAdminResolver } from "../../../admin/shared/run-audited-admin-resolver";
import { parseExtractYoutubeTranscriptArgs } from "./normalize/parse-extract-youtube-transcript-args";
import { extractYoutubeTranscript } from "./usecase/extract-youtube-transcript";

export const run = runAuditedAdminResolver({
  operation: "extractYoutubeTranscript",
  operationType: "mutation",
  parse: parseExtractYoutubeTranscriptArgs,
  resolveAuditFields: resolveJobIdAuditFields(),
  run: async ({ parsed }) => extractYoutubeTranscript(parsed),
});
