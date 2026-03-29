import { Handler } from "aws-lambda";
import { run as attachJobToContent } from "./attach-job-to-content";
import { run as createContent } from "./create-content";
import { run as deleteContent } from "./delete-content";
import { run as listContents } from "./list-contents";
import { run as updateContent } from "./update-content";
import {
  dispatchGroupedResolver,
  type GroupedResolverRoutes,
} from "../shared/grouped-router";
import { type GroupedGraphqlResolverEvent } from "../shared/graphql-event";

const routes: GroupedResolverRoutes = {
  adminContents: listContents,
  createContent,
  updateContent,
  deleteContent,
  attachJobToContent,
};

export const run: Handler<GroupedGraphqlResolverEvent, unknown> = async (
  event,
) => {
  return dispatchGroupedResolver(event, routes, "content");
};
