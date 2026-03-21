import { Handler } from "aws-lambda";
import {
  assertAdminGroup,
  getActor,
} from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../shared/audit-log";
import { toGraphqlResolverError } from "../shared/errors";
import { GraphqlResolverEvent } from "../shared/types";
import { parseChannelPublishQueueArgs } from "./normalize/parse-channel-publish-queue-args";
import { listChannelPublishQueueUsecase } from "./usecase/list-channel-publish-queue";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const actor = getActor(event.identity);
  try {
    assertAdminGroup(event.identity);
    const { contentId } = parseChannelPublishQueueArgs(
      (event.arguments ?? {}) as Record<string, unknown>,
    );
    logResolverAudit({
      operation: "channelPublishQueue",
      operationType: "query",
      phase: "started",
      actor,
    });
    const result = await listChannelPublishQueueUsecase(contentId);
    logResolverAudit({
      operation: "channelPublishQueue",
      operationType: "query",
      phase: "succeeded",
      actor,
    });
    return result;
  } catch (error) {
    const mapped = toGraphqlResolverError(error);
    logResolverAudit({
      operation: "channelPublishQueue",
      operationType: "query",
      phase: "failed",
      actor,
      errorCode: mapped.code,
      errorMessage: mapped.message,
    });
    throw mapped;
  }
};
