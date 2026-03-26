import { Handler } from "aws-lambda";
import { getActor } from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../../shared/audit-log";
import { toGraphqlResolverError } from "../../shared/errors";
import { GraphqlResolverEvent } from "../../shared/types";
import { parseGetJobDraftArgs } from "./normalize/parse-get-job-draft-args";
import { getAdminJobDraft } from "./usecase/get-job-draft";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const actor = getActor(event.identity);
  let jobId: string | undefined;

  try {
    const parsed = parseGetJobDraftArgs(
      (event.arguments ?? {}) as Record<string, unknown>,
    );
    jobId = parsed.jobId;
    logResolverAudit({
      operation: "jobDraft",
      operationType: "query",
      phase: "started",
      actor,
      jobId,
    });
    const result = await getAdminJobDraft(parsed.jobId);
    logResolverAudit({
      operation: "jobDraft",
      operationType: "query",
      phase: "succeeded",
      actor,
      jobId,
    });
    return result;
  } catch (error) {
    const mapped = toGraphqlResolverError(error);
    logResolverAudit({
      operation: "jobDraft",
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
