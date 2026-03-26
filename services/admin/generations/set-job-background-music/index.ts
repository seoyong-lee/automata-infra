import { Handler } from "aws-lambda";
import {
  assertAdminGroup,
  getActor,
} from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../../shared/audit-log";
import { toGraphqlResolverError } from "../../shared/errors";
import { GraphqlResolverEvent } from "../../shared/types";
import { parseSetJobBackgroundMusicArgs } from "./normalize/parse-set-job-background-music-args";
import { setJobBackgroundMusic } from "./usecase/set-job-background-music";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const actor = getActor(event.identity);
  let jobId: string | undefined;

  try {
    assertAdminGroup(event.identity);
    const parsed = parseSetJobBackgroundMusicArgs(
      (event.arguments ?? {}) as Record<string, unknown>,
    );
    jobId = parsed.jobId;
    logResolverAudit({
      operation: "setJobBackgroundMusic",
      operationType: "mutation",
      phase: "started",
      actor,
      jobId,
    });
    const result = await setJobBackgroundMusic(parsed);
    logResolverAudit({
      operation: "setJobBackgroundMusic",
      operationType: "mutation",
      phase: "succeeded",
      actor,
      jobId,
    });
    return result;
  } catch (error) {
    const mapped = toGraphqlResolverError(error);
    logResolverAudit({
      operation: "setJobBackgroundMusic",
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
