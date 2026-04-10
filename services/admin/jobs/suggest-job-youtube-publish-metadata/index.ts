import { resolveJobIdAuditFields } from "../../shared/resolver-audit-fields";
import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseSuggestJobYoutubePublishMetadataArgs } from "./normalize/parse-suggest-job-youtube-publish-metadata-args";
import { suggestAdminJobYoutubePublishMetadata } from "./usecase/suggest-job-youtube-publish-metadata";

export const run = runAuditedAdminResolver({
  operation: "suggestJobYoutubePublishMetadata",
  operationType: "mutation",
  parse: parseSuggestJobYoutubePublishMetadataArgs,
  resolveAuditFields: resolveJobIdAuditFields(),
  run: async ({ parsed }) => suggestAdminJobYoutubePublishMetadata(parsed),
});
