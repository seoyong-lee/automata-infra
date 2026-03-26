import { Handler } from "aws-lambda";
import {
  assertAdminGroup,
  getActor,
} from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../../shared/audit-log";
import { toGraphqlResolverError } from "../../shared/errors";
import { GraphqlResolverEvent } from "../../shared/types";
import { parseApprovePipelineExecutionArgs } from "./normalize/parse-approve-pipeline-execution-args";
import { approvePipelineExecutionUsecase } from "./usecase/approve-pipeline-execution";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const actor = getActor(event.identity);
  let jobId: string | undefined;
  try {
    assertAdminGroup(event.identity);
    const parsed = parseApprovePipelineExecutionArgs(
      (event.arguments ?? {}) as Record<string, unknown>,
    );
    jobId = parsed.jobId;
    logResolverAudit({
      operation: "approvePipelineExecution",
      operationType: "mutation",
      phase: "started",
      actor,
      jobId,
    });
    const result = await approvePipelineExecutionUsecase(parsed);
    logResolverAudit({
      operation: "approvePipelineExecution",
      operationType: "mutation",
      phase: "succeeded",
      actor,
      jobId: result.jobId,
    });
    return result;
  } catch (error) {
    const mapped = toGraphqlResolverError(error);
    logResolverAudit({
      operation: "approvePipelineExecution",
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
