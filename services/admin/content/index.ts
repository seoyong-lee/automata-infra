import { Handler } from "aws-lambda";
import { run as attachJobToContent } from "./attach-job-to-content";
import { run as createContent } from "./create-content";
import { run as deleteContent } from "./delete-content";
import { run as listContents } from "./list-contents";
import { run as listYoutubeChannelsForSecret } from "./list-youtube-channels-for-secret";
import { run as pushYoutubeChannelToGoogle } from "./push-youtube-channel-to-google";
import { run as syncYoutubeChannelMetadata } from "./sync-youtube-channel-metadata";
import { run as updateContent } from "./update-content";
import {
  dispatchGroupedResolver,
  type GroupedResolverRoutes,
} from "../shared/grouped-router";
import { type GroupedGraphqlResolverEvent } from "../shared/graphql-event";

const routes: GroupedResolverRoutes = {
  adminContents: listContents,
  listYoutubeChannelsForSecret,
  createContent,
  updateContent,
  deleteContent,
  attachJobToContent,
  syncYoutubeChannelMetadata,
  pushYoutubeChannelToGoogle,
};

export const run: Handler<GroupedGraphqlResolverEvent, unknown> = async (
  event,
) => {
  return dispatchGroupedResolver(event, routes, "content");
};
