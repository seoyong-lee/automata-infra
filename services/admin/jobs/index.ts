import { Handler } from "aws-lambda";
import { run as createDraftJob } from "./create-draft-job";
import { run as deleteJob } from "./delete-job";
import { run as getJob } from "./get-job";
import { run as getJobDraft } from "./get-job-draft";
import { run as jobExecutions } from "./job-executions";
import { run as jobTimeline } from "./job-timeline";
import { run as listJobs } from "./list-jobs";
import { run as updateJobBrief } from "./update-job-brief";
import {
  getGroupedFieldName,
  GroupedGraphqlResolverEvent,
} from "../shared/graphql-event";

const handlers: Record<
  string,
  Handler<GroupedGraphqlResolverEvent, unknown>
> = {
  adminJobs: listJobs,
  adminJob: getJob,
  jobTimeline,
  jobExecutions,
  jobDraft: getJobDraft,
  createDraftJob,
  updateJobBrief,
  deleteJob,
};

export const run: Handler<GroupedGraphqlResolverEvent, unknown> = async (
  event,
) => {
  const fieldName = getGroupedFieldName(event);
  const handler = handlers[fieldName];
  if (!handler) {
    throw new Error(`Unsupported jobs resolver: ${fieldName}`);
  }
  return handler(event, {} as never, () => undefined);
};
