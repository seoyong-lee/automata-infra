import { Handler } from "aws-lambda";
import { parseGetJobArgs } from "./normalize/parse-get-job-args";
import { getAdminJob } from "./usecase/get-admin-job";
import { GraphqlResolverEvent } from "../shared/types";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const parsed = parseGetJobArgs(
    (event.arguments ?? {}) as Record<string, unknown>,
  );
  return getAdminJob(parsed.jobId);
};
