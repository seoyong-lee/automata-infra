import { Handler } from "aws-lambda";
import { parseListJobsArgs } from "./normalize/parse-list-jobs-args";
import { listAdminJobs } from "./usecase/list-admin-jobs";
import { GraphqlResolverEvent } from "../shared/types";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const parsed = parseListJobsArgs(
    (event.arguments ?? {}) as Record<string, unknown>,
  );
  return listAdminJobs(parsed);
};
