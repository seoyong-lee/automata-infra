import { Handler } from "aws-lambda";
import {
  assertAdminGroup,
  getActor,
} from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../shared/audit-log";
import { toGraphqlResolverError } from "../shared/errors";
import { GraphqlResolverEvent } from "../shared/types";
import { parseSetSceneVoiceProfileArgs } from "./normalize/parse-set-scene-voice-profile-args";
import { setSceneVoiceProfile } from "./usecase/set-scene-voice-profile";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const actor = getActor(event.identity);
  let jobId: string | undefined;

  try {
    assertAdminGroup(event.identity);
    const parsed = parseSetSceneVoiceProfileArgs(
      (event.arguments ?? {}) as Record<string, unknown>,
    );
    jobId = parsed.jobId;
    logResolverAudit({
      operation: "setSceneVoiceProfile",
      operationType: "mutation",
      phase: "started",
      actor,
      jobId,
      action: String(parsed.sceneId),
    });
    const result = await setSceneVoiceProfile(parsed);
    logResolverAudit({
      operation: "setSceneVoiceProfile",
      operationType: "mutation",
      phase: "succeeded",
      actor,
      jobId,
      action: String(parsed.sceneId),
    });
    return result;
  } catch (error) {
    const mapped = toGraphqlResolverError(error);
    logResolverAudit({
      operation: "setSceneVoiceProfile",
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
