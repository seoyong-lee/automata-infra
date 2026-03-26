import { Handler } from "aws-lambda";
import { getActor } from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../../shared/audit-log";
import { toGraphqlResolverError } from "../../shared/errors";
import { parseListJobsArgs } from "./normalize/parse-list-jobs-args";
import { listAdminJobs } from "./usecase/list-admin-jobs";
import { GraphqlResolverEvent } from "../../shared/types";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const actor = getActor(event.identity);
  try {
    logResolverAudit({
      operation: "adminJobs",
      operationType: "query",
      phase: "started",
      actor,
    });
    const parsed = parseListJobsArgs(
      (event.arguments ?? {}) as Record<string, unknown>,
    );
    const result = await listAdminJobs(parsed);
    logResolverAudit({
      operation: "adminJobs",
      operationType: "query",
      phase: "succeeded",
      actor,
    });
    return result;
  } catch (error) {
    const mapped = toGraphqlResolverError(error);
    logResolverAudit({
      operation: "adminJobs",
      operationType: "query",
      phase: "failed",
      actor,
      errorCode: mapped.code,
      errorMessage: mapped.message,
    });
    throw mapped;
  }
};
