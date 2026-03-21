import { Handler } from "aws-lambda";
import {
  assertAdminGroup,
  getActor,
} from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../shared/audit-log";
import { toGraphqlResolverError } from "../shared/errors";
import { GraphqlResolverEvent } from "../shared/types";
import { parseAttachJobToContentArgs } from "./normalize/parse-attach-job-to-content-args";
import { attachAdminJobToContent } from "./usecase/attach-job-to-content";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const actor = getActor(event.identity);
  let jobId: string | undefined;
  try {
    assertAdminGroup(event.identity);
    const parsed = parseAttachJobToContentArgs(
      (event.arguments ?? {}) as Record<string, unknown>,
    );
    jobId = parsed.jobId;
    logResolverAudit({
      operation: "attachJobToContent",
      operationType: "mutation",
      phase: "started",
      actor,
      jobId,
    });
    const result = await attachAdminJobToContent(parsed);
    logResolverAudit({
      operation: "attachJobToContent",
      operationType: "mutation",
      phase: "succeeded",
      actor,
      jobId: result.jobId,
    });
    return result;
  } catch (error) {
    const mapped = toGraphqlResolverError(error);
    logResolverAudit({
      operation: "attachJobToContent",
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
