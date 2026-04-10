import { combineResolverAuditFields, resolveContentIdAuditFields } from "../../shared/resolver-audit-fields";
import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseSyncYoutubeChannelMetadataArgs } from "./normalize/parse-sync-youtube-channel-metadata-args";
import { syncYoutubeChannelMetadataUsecase } from "./usecase/sync-youtube-channel-metadata";

export const run = runAuditedAdminResolver({
  operation: "syncYoutubeChannelMetadata",
  operationType: "mutation",
  parse: parseSyncYoutubeChannelMetadataArgs,
  resolveAuditFields: combineResolverAuditFields(
    resolveContentIdAuditFields(),
  ),
  run: async ({ parsed, actor }) =>
    syncYoutubeChannelMetadataUsecase({ contentId: parsed.contentId, actor }),
});
