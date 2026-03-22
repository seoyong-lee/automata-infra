import { Handler } from "aws-lambda";
import {
  assertAdminGroup,
  getActor,
} from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../shared/audit-log";
import { toGraphqlResolverError } from "../shared/errors";
import { routePublishDomain } from "./route-publish-domain";

type AppsyncResolverEvent = {
  arguments?: Record<string, unknown>;
  identity?: unknown;
  info?: { fieldName?: string; parentTypeName?: string };
};

export const run: Handler<AppsyncResolverEvent, unknown> = async (event) => {
  const actor = getActor(event.identity);
  const fieldName = event.info?.fieldName;
  const parentTypeName = event.info?.parentTypeName;
  const operationType =
    parentTypeName === "Mutation" ? "mutation" : "query";
  try {
    assertAdminGroup(event.identity);
    logResolverAudit({
      operation: fieldName ?? "publishDomainRouter",
      operationType,
      phase: "started",
      actor,
    });
    const result = await routePublishDomain(
      fieldName,
      (event.arguments ?? {}) as Record<string, unknown>,
    );
    logResolverAudit({
      operation: fieldName ?? "publishDomainRouter",
      operationType,
      phase: "succeeded",
      actor,
    });
    return result;
  } catch (error) {
    const mapped = toGraphqlResolverError(error);
    logResolverAudit({
      operation: fieldName ?? "publishDomainRouter",
      operationType,
      phase: "failed",
      actor,
      errorCode: mapped.code,
      errorMessage: mapped.message,
    });
    throw mapped;
  }
};
