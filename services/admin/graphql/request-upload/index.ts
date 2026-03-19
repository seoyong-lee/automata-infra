import { Handler } from "aws-lambda";
import { assertAdminGroup } from "../../../shared/lib/auth/admin-claims";
import { parseRequestUploadArgs } from "./normalize/parse-request-upload-args";
import { requestUploadMutation } from "./usecase/request-upload";
import { GraphqlResolverEvent } from "../shared/types";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  assertAdminGroup(event.identity);
  const parsed = parseRequestUploadArgs(
    (event.arguments ?? {}) as Record<string, unknown>,
  );
  return requestUploadMutation(parsed.jobId);
};
