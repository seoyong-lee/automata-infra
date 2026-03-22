import { Handler } from "aws-lambda";
import {
  assertAdminGroup,
  getActor,
} from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../shared/audit-log";
import { toGraphqlResolverError } from "../shared/errors";
import { GraphqlResolverEvent } from "../shared/types";
import { parseSelectSceneVoiceCandidateArgs } from "./normalize/parse-select-scene-voice-candidate-args";
import { selectSceneVoiceCandidateUsecase } from "./usecase/select-scene-voice-candidate";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const actor = getActor(event.identity);
  let jobId: string | undefined;

  try {
    assertAdminGroup(event.identity);
    const parsed = parseSelectSceneVoiceCandidateArgs(
      (event.arguments ?? {}) as Record<string, unknown>,
    );
    jobId = parsed.jobId;
    logResolverAudit({
      operation: "selectSceneVoiceCandidate",
      operationType: "mutation",
      phase: "started",
      actor,
      jobId,
    });
    const result = await selectSceneVoiceCandidateUsecase(parsed);
    logResolverAudit({
      operation: "selectSceneVoiceCandidate",
      operationType: "mutation",
      phase: "succeeded",
      actor,
      jobId,
    });
    return result;
  } catch (error) {
    const mapped = toGraphqlResolverError(error);
    logResolverAudit({
      operation: "selectSceneVoiceCandidate",
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
