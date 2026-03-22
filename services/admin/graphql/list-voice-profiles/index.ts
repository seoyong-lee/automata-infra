import { Handler } from "aws-lambda";
import { getActor } from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../shared/audit-log";
import { toGraphqlResolverError } from "../shared/errors";
import { GraphqlResolverEvent } from "../shared/types";
import { listVoiceProfiles } from "./usecase/list-voice-profiles";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const actor = getActor(event.identity);

  try {
    logResolverAudit({
      operation: "voiceProfiles",
      operationType: "query",
      phase: "started",
      actor,
    });
    const result = await listVoiceProfiles();
    logResolverAudit({
      operation: "voiceProfiles",
      operationType: "query",
      phase: "succeeded",
      actor,
    });
    return result;
  } catch (error) {
    const mapped = toGraphqlResolverError(error);
    logResolverAudit({
      operation: "voiceProfiles",
      operationType: "query",
      phase: "failed",
      actor,
      errorCode: mapped.code,
      errorMessage: mapped.message,
    });
    throw mapped;
  }
};
