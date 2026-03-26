import { Handler } from "aws-lambda";
import {
  assertAdminGroup,
  getActor,
} from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../../../admin/shared/audit-log";
import { toGraphqlResolverError } from "../../../admin/shared/errors";
import { parseRequestUploadArgs } from "./normalize/parse-request-upload-args";
import { requestUploadMutation } from "./usecase/request-upload";
import { GraphqlResolverEvent } from "../../../admin/shared/types";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const actor = getActor(event.identity);
  let jobId: string | undefined;

  try {
    assertAdminGroup(event.identity);
    const parsed = parseRequestUploadArgs(
      (event.arguments ?? {}) as Record<string, unknown>,
    );
    jobId = parsed.jobId;

    logResolverAudit({
      operation: "requestUpload",
      operationType: "mutation",
      phase: "started",
      actor,
      jobId,
    });

    const result = await requestUploadMutation(parsed.jobId);

    logResolverAudit({
      operation: "requestUpload",
      operationType: "mutation",
      phase: "succeeded",
      actor,
      jobId,
    });

    return result;
  } catch (error) {
    const mapped = toGraphqlResolverError(error);

    logResolverAudit({
      operation: "requestUpload",
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
