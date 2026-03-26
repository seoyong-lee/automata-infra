import { Handler } from "aws-lambda";
import {
  assertAdminGroup,
  getActor,
} from "../../../shared/lib/auth/admin-claims";
import { logResolverAudit } from "../../../admin/shared/audit-log";
import { toGraphqlResolverError } from "../../../admin/shared/errors";
import { GraphqlResolverEvent } from "../../../admin/shared/types";
import { parseRequestAssetUploadArgs } from "./normalize/parse-request-asset-upload-args";
import { requestAssetUpload } from "./usecase/request-asset-upload";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const actor = getActor(event.identity);
  let jobId: string | undefined;

  try {
    assertAdminGroup(event.identity);
    const parsed = parseRequestAssetUploadArgs(
      (event.arguments ?? {}) as Record<string, unknown>,
    );
    jobId = parsed.jobId;
    logResolverAudit({
      operation: "requestAssetUpload",
      operationType: "mutation",
      phase: "started",
      actor,
      jobId,
    });
    const result = await requestAssetUpload(parsed);
    logResolverAudit({
      operation: "requestAssetUpload",
      operationType: "mutation",
      phase: "succeeded",
      actor,
      jobId,
    });
    return result;
  } catch (error) {
    const mapped = toGraphqlResolverError(error);
    logResolverAudit({
      operation: "requestAssetUpload",
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
