import { Handler } from "aws-lambda";
import { getActor } from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../shared/audit-log";
import { toGraphqlResolverError } from "../shared/errors";
import { GraphqlResolverEvent } from "../shared/types";
import { parseListContentsArgs } from "./normalize/parse-list-contents-args";
import { listContentsUsecase } from "./usecase/list-contents";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const actor = getActor(event.identity);
  try {
    logResolverAudit({
      operation: "adminContents",
      operationType: "query",
      phase: "started",
      actor,
    });
    const parsed = parseListContentsArgs(
      (event.arguments ?? {}) as Record<string, unknown>,
    );
    const result = await listContentsUsecase(parsed);
    logResolverAudit({
      operation: "adminContents",
      operationType: "query",
      phase: "succeeded",
      actor,
    });
    return result;
  } catch (error) {
    const mapped = toGraphqlResolverError(error);
    logResolverAudit({
      operation: "adminContents",
      operationType: "query",
      phase: "failed",
      actor,
      errorCode: mapped.code,
      errorMessage: mapped.message,
    });
    throw mapped;
  }
};
