import { Handler } from "aws-lambda";
import {
  assertAdminGroup,
  getActor,
} from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../../shared/audit-log";
import { toGraphqlResolverError } from "../../shared/errors";
import { GraphqlResolverEvent } from "../../shared/types";
import { parseCreateContentArgs } from "./normalize/parse-create-content-args";
import { createAdminContent } from "./usecase/create-content";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const actor = getActor(event.identity);
  try {
    assertAdminGroup(event.identity);
    const parsed = parseCreateContentArgs(
      (event.arguments ?? {}) as Record<string, unknown>,
    );
    logResolverAudit({
      operation: "createContent",
      operationType: "mutation",
      phase: "started",
      actor,
    });
    const result = await createAdminContent({ ...parsed, actor });
    logResolverAudit({
      operation: "createContent",
      operationType: "mutation",
      phase: "succeeded",
      actor,
      action: result.contentId,
    });
    return result;
  } catch (error) {
    const mapped = toGraphqlResolverError(error);
    logResolverAudit({
      operation: "createContent",
      operationType: "mutation",
      phase: "failed",
      actor,
      errorCode: mapped.code,
      errorMessage: mapped.message,
    });
    throw mapped;
  }
};
