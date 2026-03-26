import { Handler } from "aws-lambda";
import { getActor } from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../../shared/audit-log";
import { toGraphqlResolverError } from "../../shared/errors";
import { GraphqlResolverEvent } from "../../shared/types";
import { parseJobExecutionsArgs } from "./normalize/parse-job-executions-args";
import { getAdminJobExecutions } from "./usecase/get-job-executions";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const actor = getActor(event.identity);
  let jobId: string | undefined;
  try {
    const parsed = parseJobExecutionsArgs(
      (event.arguments ?? {}) as Record<string, unknown>,
    );
    jobId = parsed.jobId;
    logResolverAudit({
      operation: "jobExecutions",
      operationType: "query",
      phase: "started",
      actor,
      jobId,
    });
    const result = await getAdminJobExecutions(parsed.jobId);
    logResolverAudit({
      operation: "jobExecutions",
      operationType: "query",
      phase: "succeeded",
      actor,
      jobId,
    });
    return result;
  } catch (error) {
    const mapped = toGraphqlResolverError(error);
    logResolverAudit({
      operation: "jobExecutions",
      operationType: "query",
      phase: "failed",
      actor,
      jobId,
      errorCode: mapped.code,
      errorMessage: mapped.message,
    });
    throw mapped;
  }
};
