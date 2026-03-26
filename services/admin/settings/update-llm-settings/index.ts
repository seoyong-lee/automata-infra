import { Handler } from "aws-lambda";
import {
  assertAdminGroup,
  getActor,
} from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../../shared/audit-log";
import { toGraphqlResolverError } from "../../shared/errors";
import { GraphqlResolverEvent } from "../../shared/types";
import { parseUpdateLlmSettingsArgs } from "./normalize/parse-update-llm-settings-args";
import { updateAdminLlmStepSettings } from "./usecase/update-llm-step-settings";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const actor = getActor(event.identity);
  let stepKey: string | undefined;

  try {
    assertAdminGroup(event.identity);
    const parsed = parseUpdateLlmSettingsArgs(
      (event.arguments ?? {}) as Record<string, unknown>,
    );
    stepKey = parsed.stepKey;

    logResolverAudit({
      operation: "updateLlmStepSettings",
      operationType: "mutation",
      phase: "started",
      actor,
      action: stepKey,
    });

    const result = await updateAdminLlmStepSettings({
      ...parsed,
      actor,
    });

    logResolverAudit({
      operation: "updateLlmStepSettings",
      operationType: "mutation",
      phase: "succeeded",
      actor,
      action: stepKey,
    });

    return result;
  } catch (error) {
    const mapped = toGraphqlResolverError(error);

    logResolverAudit({
      operation: "updateLlmStepSettings",
      operationType: "mutation",
      phase: "failed",
      actor,
      action: stepKey,
      errorCode: mapped.code,
      errorMessage: mapped.message,
    });

    throw mapped;
  }
};
