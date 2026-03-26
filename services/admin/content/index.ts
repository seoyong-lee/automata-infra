import { Handler } from "aws-lambda";
import { run as attachJobToContent } from "./attach-job-to-content";
import { run as createContent } from "./create-content";
import { run as deleteContent } from "./delete-content";
import { run as listContents } from "./list-contents";
import { run as updateContent } from "./update-content";
import {
  getGroupedFieldName,
  GroupedGraphqlResolverEvent,
} from "../shared/graphql-event";

const handlers: Record<
  string,
  Handler<GroupedGraphqlResolverEvent, unknown>
> = {
  adminContents: listContents,
  createContent,
  updateContent,
  deleteContent,
  attachJobToContent,
};

export const run: Handler<GroupedGraphqlResolverEvent, unknown> = async (
  event,
) => {
  const fieldName = getGroupedFieldName(event);
  const handler = handlers[fieldName];
  if (!handler) {
    throw new Error(`Unsupported content resolver: ${fieldName}`);
  }
  return handler(event, {} as never, () => undefined);
};
