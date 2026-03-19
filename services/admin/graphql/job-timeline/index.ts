import { Handler } from "aws-lambda";
import { parseJobTimelineArgs } from "./normalize/parse-job-timeline-args";
import { getJobTimeline } from "./usecase/get-job-timeline";
import { GraphqlResolverEvent } from "../shared/types";

export const run: Handler<
  GraphqlResolverEvent<Record<string, unknown>>,
  unknown
> = async (event) => {
  const parsed = parseJobTimelineArgs(
    (event.arguments ?? {}) as Record<string, unknown>,
  );
  return getJobTimeline(parsed.jobId);
};
