import { Handler } from "aws-lambda";
import {
  assertAdminGroup,
  getActor,
} from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../../shared/audit-log";
import { toGraphqlResolverError } from "../../shared/errors";
import { GraphqlResolverEvent } from "../../shared/types";
import { parseSetJobDefaultVoiceProfileArgs } from "./normalize/parse-set-job-default-voice-profile-args";
import { setJobDefaultVoiceProfile } from "./usecase/set-job-default-voice-profile";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const actor = getActor(event.identity);
  let jobId: string | undefined;

  try {
    assertAdminGroup(event.identity);
    const parsed = parseSetJobDefaultVoiceProfileArgs(
      (event.arguments ?? {}) as Record<string, unknown>,
    );
    jobId = parsed.jobId;
    logResolverAudit({
      operation: "setJobDefaultVoiceProfile",
      operationType: "mutation",
      phase: "started",
      actor,
      jobId,
    });
    const result = await setJobDefaultVoiceProfile(parsed);
    logResolverAudit({
      operation: "setJobDefaultVoiceProfile",
      operationType: "mutation",
      phase: "succeeded",
      actor,
      jobId,
    });
    return result;
  } catch (error) {
    const mapped = toGraphqlResolverError(error);
    logResolverAudit({
      operation: "setJobDefaultVoiceProfile",
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
