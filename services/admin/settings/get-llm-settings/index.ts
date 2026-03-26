import { Handler } from "aws-lambda";
import {
  assertAdminGroup,
  getActor,
} from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../../shared/audit-log";
import { toGraphqlResolverError } from "../../shared/errors";
import { GraphqlResolverEvent } from "../../shared/types";
import { getLlmSettings } from "./usecase/get-llm-settings";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const actor = getActor(event.identity);

  try {
    assertAdminGroup(event.identity);
    logResolverAudit({
      operation: "llmSettings",
      operationType: "query",
      phase: "started",
      actor,
    });
    const result = await getLlmSettings();
    logResolverAudit({
      operation: "llmSettings",
      operationType: "query",
      phase: "succeeded",
      actor,
    });
    return result;
  } catch (error) {
    const mapped = toGraphqlResolverError(error);
    logResolverAudit({
      operation: "llmSettings",
      operationType: "query",
      phase: "failed",
      actor,
      errorCode: mapped.code,
      errorMessage: mapped.message,
    });
    throw mapped;
  }
};
