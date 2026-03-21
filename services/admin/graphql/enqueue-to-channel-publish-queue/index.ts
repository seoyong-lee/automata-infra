import { Handler } from "aws-lambda";
import {
  assertAdminGroup,
  getActor,
} from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../shared/audit-log";
import { toGraphqlResolverError } from "../shared/errors";
import { GraphqlResolverEvent } from "../shared/types";
import { parseEnqueueToChannelPublishQueueArgs } from "./normalize/parse-enqueue-to-channel-publish-queue-args";
import { enqueueToChannelPublishQueueUsecase } from "./usecase/enqueue-to-channel-publish-queue";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const actor = getActor(event.identity);
  let jobId: string | undefined;
  try {
    assertAdminGroup(event.identity);
    const parsed = parseEnqueueToChannelPublishQueueArgs(
      (event.arguments ?? {}) as Record<string, unknown>,
    );
    jobId = parsed.jobId;
    logResolverAudit({
      operation: "enqueueToChannelPublishQueue",
      operationType: "mutation",
      phase: "started",
      actor,
      jobId,
    });
    const result = await enqueueToChannelPublishQueueUsecase({
      ...parsed,
      enqueuedBy: actor,
    });
    logResolverAudit({
      operation: "enqueueToChannelPublishQueue",
      operationType: "mutation",
      phase: "succeeded",
      actor,
      jobId: result.jobId,
    });
    return result;
  } catch (error) {
    const mapped = toGraphqlResolverError(error);
    logResolverAudit({
      operation: "enqueueToChannelPublishQueue",
      operationType: "mutation",
      phase: "failed",
      actor,
      jobId,
      errorCode: mapped.code,
      errorMessage: mapped.message,
    });
    throw mapped;
  }
};
