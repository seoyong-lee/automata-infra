import { combineResolverAuditFields, resolveContentIdAuditFields } from "../../shared/resolver-audit-fields";
import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parsePushYoutubeChannelToGoogleArgs } from "./normalize/parse-push-youtube-channel-to-google-args";
import { pushYoutubeChannelToGoogleUsecase } from "./usecase/push-youtube-channel-to-google";

export const run = runAuditedAdminResolver({
  operation: "pushYoutubeChannelToGoogle",
  operationType: "mutation",
  parse: parsePushYoutubeChannelToGoogleArgs,
  resolveAuditFields: combineResolverAuditFields(
    resolveContentIdAuditFields(),
  ),
  run: async ({ parsed, actor }) =>
    pushYoutubeChannelToGoogleUsecase({ ...parsed, actor }),
});
