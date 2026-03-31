import { Handler } from "aws-lambda";

import { run as createVideoTranscriptFromUpload } from "./create-video-transcript-from-upload";
import { run as createVideoTranscriptFromYoutube } from "./create-video-transcript-from-youtube";
import { run as getTranscript } from "./get-transcript";
import { run as requestTranscriptUpload } from "./request-transcript-upload";
import {
  dispatchGroupedResolver,
  type GroupedResolverRoutes,
} from "../shared/grouped-router";
import { type GroupedGraphqlResolverEvent } from "../shared/graphql-event";

const routes: GroupedResolverRoutes = {
  requestTranscriptUpload,
  createVideoTranscriptFromUpload,
  createVideoTranscriptFromYoutube,
  getTranscript,
};

export const run: Handler<GroupedGraphqlResolverEvent, unknown> = async (
  event,
) => {
  return dispatchGroupedResolver(event, routes, "transcripts");
};
