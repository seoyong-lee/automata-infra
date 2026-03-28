import { Handler } from "aws-lambda";
import {
  assertAdminGroup,
  getActor,
} from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../../shared/audit-log";
import { toGraphqlResolverError } from "../../shared/errors";
import { GraphqlResolverEvent } from "../../shared/types";
import { parseUpsertContentPresetArgs } from "./normalize/parse-upsert-content-preset-args";
import { upsertContentPreset } from "./usecase/upsert-content-preset";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const actor = getActor(event.identity);
  let presetId: string | undefined;

  try {
    assertAdminGroup(event.identity);
    const parsed = parseUpsertContentPresetArgs(
      (event.arguments ?? {}) as Record<string, unknown>,
    );
    presetId = parsed.presetId;
    logResolverAudit({
      operation: "upsertContentPreset",
      operationType: "mutation",
      phase: "started",
      actor,
      action: presetId,
    });
    const result = await upsertContentPreset(parsed);
    logResolverAudit({
      operation: "upsertContentPreset",
      operationType: "mutation",
      phase: "succeeded",
      actor,
      action: presetId,
    });
    return result;
  } catch (error) {
    const mapped = toGraphqlResolverError(error);
    logResolverAudit({
      operation: "upsertContentPreset",
      operationType: "mutation",
      phase: "failed",
      actor,
      action: presetId,
      errorCode: mapped.code,
      errorMessage: mapped.message,
    });
    throw mapped;
  }
};
