import { resolveContentIdAuditFields } from "../../shared/resolver-audit-fields";
import { runAuditedAdminResolver } from "../../shared/run-audited-admin-resolver";
import { parseChannelPublishQueueArgs } from "./normalize/parse-channel-publish-queue-args";
import { listChannelPublishQueue } from "./usecase/list-channel-publish-queue";

export const run = runAuditedAdminResolver({
  operation: "channelPublishQueue",
  operationType: "query",
  parse: parseChannelPublishQueueArgs,
  resolveAuditFields: resolveContentIdAuditFields(),
  run: async ({ parsed }) => listChannelPublishQueue(parsed),
});
