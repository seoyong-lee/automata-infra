import { Handler } from "aws-lambda";
import {
  assertAdminGroup,
  getActor,
} from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../../shared/audit-log";
import { toGraphqlResolverError } from "../../shared/errors";
import { GraphqlResolverEvent } from "../../shared/types";
import { parseUpsertVoiceProfileArgs } from "./normalize/parse-upsert-voice-profile-args";
import { upsertVoiceProfile } from "./usecase/upsert-voice-profile";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const actor = getActor(event.identity);
  let profileId: string | undefined;

  try {
    assertAdminGroup(event.identity);
    const parsed = parseUpsertVoiceProfileArgs(
      (event.arguments ?? {}) as Record<string, unknown>,
    );
    profileId = parsed.profileId;
    logResolverAudit({
      operation: "upsertVoiceProfile",
      operationType: "mutation",
      phase: "started",
      actor,
      action: profileId,
    });
    const result = await upsertVoiceProfile({
      ...parsed,
      actor,
    });
    logResolverAudit({
      operation: "upsertVoiceProfile",
      operationType: "mutation",
      phase: "succeeded",
      actor,
      action: profileId,
    });
    return result;
  } catch (error) {
    const mapped = toGraphqlResolverError(error);
    logResolverAudit({
      operation: "upsertVoiceProfile",
      operationType: "mutation",
      phase: "failed",
      actor,
      action: profileId,
      errorCode: mapped.code,
      errorMessage: mapped.message,
    });
    throw mapped;
  }
};
