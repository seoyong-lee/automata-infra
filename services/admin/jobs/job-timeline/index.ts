import { Handler } from "aws-lambda";
import {
  assertAdminGroup,
  getActor,
} from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../../shared/audit-log";
import { toGraphqlResolverError } from "../../shared/errors";
import { parseJobTimelineArgs } from "./normalize/parse-job-timeline-args";
import { getJobTimeline } from "./usecase/get-job-timeline";
import { GraphqlResolverEvent } from "../../shared/types";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const actor = getActor(event.identity);
  let jobId: string | undefined;
  try {
    assertAdminGroup(event.identity);
    const parsed = parseJobTimelineArgs(
      (event.arguments ?? {}) as Record<string, unknown>,
    );
    jobId = parsed.jobId;
    logResolverAudit({
      operation: "jobTimeline",
      operationType: "query",
      phase: "started",
      actor,
      jobId,
    });
    const result = await getJobTimeline(parsed.jobId);
    logResolverAudit({
      operation: "jobTimeline",
      operationType: "query",
      phase: "succeeded",
      actor,
      jobId,
    });
    return result;
  } catch (error) {
    const mapped = toGraphqlResolverError(error);
    logResolverAudit({
      operation: "jobTimeline",
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
