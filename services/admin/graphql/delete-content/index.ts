import { Handler } from "aws-lambda";
import {
  assertAdminGroup,
  getActor,
} from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../shared/audit-log";
import { toGraphqlResolverError } from "../shared/errors";
import { GraphqlResolverEvent } from "../shared/types";
import { parseDeleteContentArgs } from "./normalize/parse-delete-content-args";
import { deleteAdminContent } from "./usecase/delete-content";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const actor = getActor(event.identity);
  let contentId: string | undefined;
  try {
    assertAdminGroup(event.identity);
    const parsed = parseDeleteContentArgs(
      (event.arguments ?? {}) as Record<string, unknown>,
    );
    contentId = parsed.contentId;
    logResolverAudit({
      operation: "deleteContent",
      operationType: "mutation",
      phase: "started",
      actor,
      action: contentId,
    });
    const result = await deleteAdminContent(parsed);
    logResolverAudit({
      operation: "deleteContent",
      operationType: "mutation",
      phase: "succeeded",
      actor,
      action: result.contentId,
    });
    return result;
  } catch (error) {
    const mapped = toGraphqlResolverError(error);
    logResolverAudit({
      operation: "deleteContent",
      operationType: "mutation",
      phase: "failed",
      actor,
      action: contentId,
      errorCode: mapped.code,
      errorMessage: mapped.message,
    });
    throw mapped;
  }
};
