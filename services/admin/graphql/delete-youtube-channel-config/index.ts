import { Handler } from "aws-lambda";
import {
  assertAdminGroup,
  getActor,
} from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../shared/audit-log";
import { toGraphqlResolverError } from "../shared/errors";
import { GraphqlResolverEvent } from "../shared/types";
import { parseDeleteYoutubeChannelConfigArgs } from "./normalize/parse-delete-youtube-channel-config-args";
import { deleteYoutubeChannelConfig } from "./usecase/delete-youtube-channel-config";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const actor = getActor(event.identity);
  let channelId: string | undefined;
  try {
    assertAdminGroup(event.identity);
    const parsed = parseDeleteYoutubeChannelConfigArgs(
      (event.arguments ?? {}) as Record<string, unknown>,
    );
    channelId = parsed.channelId;
    logResolverAudit({
      operation: "deleteYoutubeChannelConfig",
      operationType: "mutation",
      phase: "started",
      actor,
      action: channelId,
    });
    const result = await deleteYoutubeChannelConfig(parsed.channelId);
    logResolverAudit({
      operation: "deleteYoutubeChannelConfig",
      operationType: "mutation",
      phase: "succeeded",
      actor,
      action: channelId,
    });
    return result;
  } catch (error) {
    const mapped = toGraphqlResolverError(error);
    logResolverAudit({
      operation: "deleteYoutubeChannelConfig",
      operationType: "mutation",
      phase: "failed",
      actor,
      action: channelId,
      errorCode: mapped.code,
      errorMessage: mapped.message,
    });
    throw mapped;
  }
};
