import { Handler } from "aws-lambda";
import {
  assertAdminGroup,
  getActor,
} from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../shared/audit-log";
import { toGraphqlResolverError } from "../shared/errors";
import { GraphqlResolverEvent } from "../shared/types";
import { parsePlatformConnectionsArgs } from "./normalize/parse-platform-connections-args";
import { listPlatformConnectionsUsecase } from "./usecase/list-platform-connections";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const actor = getActor(event.identity);
  try {
    assertAdminGroup(event.identity);
    const { contentId } = parsePlatformConnectionsArgs(
      (event.arguments ?? {}) as Record<string, unknown>,
    );
    logResolverAudit({
      operation: "platformConnections",
      operationType: "query",
      phase: "started",
      actor,
    });
    const result = await listPlatformConnectionsUsecase(contentId);
    logResolverAudit({
      operation: "platformConnections",
      operationType: "query",
      phase: "succeeded",
      actor,
    });
    return Array.isArray(result) ? result : [];
  } catch (error) {
    const mapped = toGraphqlResolverError(error);
    logResolverAudit({
      operation: "platformConnections",
      operationType: "query",
      phase: "failed",
      actor,
      errorCode: mapped.code,
      errorMessage: mapped.message,
    });
    throw mapped;
  }
};
