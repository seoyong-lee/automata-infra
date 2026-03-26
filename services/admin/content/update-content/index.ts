import { Handler } from "aws-lambda";
import {
  assertAdminGroup,
  getActor,
} from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../../shared/audit-log";
import { toGraphqlResolverError } from "../../shared/errors";
import { GraphqlResolverEvent } from "../../shared/types";
import { parseUpdateContentArgs } from "./normalize/parse-update-content-args";
import { updateAdminContent } from "./usecase/update-content";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const actor = getActor(event.identity);
  let contentId: string | undefined;
  try {
    assertAdminGroup(event.identity);
    const parsed = parseUpdateContentArgs(
      (event.arguments ?? {}) as Record<string, unknown>,
    );
    contentId = parsed.draft.contentId;
    logResolverAudit({
      operation: "updateContent",
      operationType: "mutation",
      phase: "started",
      actor,
      action: contentId,
    });
    const result = await updateAdminContent({ ...parsed, actor });
    logResolverAudit({
      operation: "updateContent",
      operationType: "mutation",
      phase: "succeeded",
      actor,
      action: result.contentId,
    });
    return result;
  } catch (error) {
    const mapped = toGraphqlResolverError(error);
    logResolverAudit({
      operation: "updateContent",
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
