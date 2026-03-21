import { Handler } from "aws-lambda";
import {
  assertAdminGroup,
  getActor,
} from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../shared/audit-log";
import { toGraphqlResolverError } from "../shared/errors";
import { GraphqlResolverEvent } from "../shared/types";
import { parseDeleteJobArgs } from "./normalize/parse-delete-job-args";
import { deleteAdminJob } from "./usecase/delete-job";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const actor = getActor(event.identity);
  let jobId: string | undefined;
  try {
    assertAdminGroup(event.identity);
    const parsed = parseDeleteJobArgs(
      (event.arguments ?? {}) as Record<string, unknown>,
    );
    jobId = parsed.jobId;
    logResolverAudit({
      operation: "deleteJob",
      operationType: "mutation",
      phase: "started",
      actor,
      jobId,
    });
    const result = await deleteAdminJob(parsed);
    logResolverAudit({
      operation: "deleteJob",
      operationType: "mutation",
      phase: "succeeded",
      actor,
      jobId: result.jobId,
    });
    return result;
  } catch (error) {
    const mapped = toGraphqlResolverError(error);
    logResolverAudit({
      operation: "deleteJob",
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
