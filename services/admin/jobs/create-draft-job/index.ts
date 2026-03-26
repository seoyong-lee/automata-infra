import { Handler } from "aws-lambda";
import {
  assertAdminGroup,
  getActor,
} from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../../shared/audit-log";
import { toGraphqlResolverError } from "../../shared/errors";
import { GraphqlResolverEvent } from "../../shared/types";
import { parseCreateDraftJobArgs } from "./normalize/parse-create-draft-job-args";
import { createAdminDraftJob } from "./usecase/create-draft-job";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const actor = getActor(event.identity);
  try {
    assertAdminGroup(event.identity);
    const parsed = parseCreateDraftJobArgs(
      (event.arguments ?? {}) as Record<string, unknown>,
    );
    logResolverAudit({
      operation: "createDraftJob",
      operationType: "mutation",
      phase: "started",
      actor,
    });
    const result = await createAdminDraftJob({ ...parsed, triggeredBy: actor });
    logResolverAudit({
      operation: "createDraftJob",
      operationType: "mutation",
      phase: "succeeded",
      actor,
      jobId: result.jobId,
    });
    return result;
  } catch (error) {
    const mapped = toGraphqlResolverError(error);
    logResolverAudit({
      operation: "createDraftJob",
      operationType: "mutation",
      phase: "failed",
      actor,
      errorCode: mapped.code,
      errorMessage: mapped.message,
    });
    throw mapped;
  }
};
