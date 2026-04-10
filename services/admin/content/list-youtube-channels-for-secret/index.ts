import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseListYoutubeChannelsForSecretArgs } from "./normalize/parse-list-youtube-channels-for-secret-args";
import { listYoutubeChannelsForSecretUsecase } from "./usecase/list-youtube-channels-for-secret";

export const run = runAuditedAdminResolver({
  operation: "listYoutubeChannelsForSecret",
  operationType: "query",
  parse: parseListYoutubeChannelsForSecretArgs,
  run: async ({ parsed }) =>
    listYoutubeChannelsForSecretUsecase({
      youtubeSecretName: parsed.youtubeSecretName,
    }),
});
