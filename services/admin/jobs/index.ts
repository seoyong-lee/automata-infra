import { Handler } from "aws-lambda";
import { run as createDraftJob } from "./create-draft-job";
import { run as deleteJob } from "./delete-job";
import { run as getJob } from "./get-job";
import { run as getJobDraft } from "./get-job-draft";
import { run as jobExecutions } from "./job-executions";
import { run as jobTimeline } from "./job-timeline";
import { run as listJobs } from "./list-jobs";
import { run as suggestJobYoutubePublishMetadata } from "./suggest-job-youtube-publish-metadata";
import { run as updateJobBrief } from "./update-job-brief";
import {
  dispatchGroupedResolver,
  type GroupedResolverRoutes,
} from "../shared/grouped-router";
import { type GroupedGraphqlResolverEvent } from "../shared/graphql-event";

const routes: GroupedResolverRoutes = {
  adminJobs: listJobs,
  adminJob: getJob,
  jobTimeline,
  jobExecutions,
  jobDraft: getJobDraft,
  createDraftJob,
  updateJobBrief,
  suggestJobYoutubePublishMetadata,
  deleteJob,
};

export const run: Handler<GroupedGraphqlResolverEvent, unknown> = async (
  event,
) => {
  return dispatchGroupedResolver(event, routes, "jobs");
};
