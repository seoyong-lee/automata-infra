import type { Handler } from "aws-lambda";
import {
  getGroupedFieldName,
  type GroupedGraphqlResolverEvent,
} from "./graphql-event";

export type GroupedResolverHandler = Handler<
  GroupedGraphqlResolverEvent,
  unknown
>;

export type GroupedResolverRoutes = Record<string, GroupedResolverHandler>;

export const dispatchGroupedResolver = async (
  event: GroupedGraphqlResolverEvent,
  routes: GroupedResolverRoutes,
  scope: string,
) => {
  const fieldName = getGroupedFieldName(event);
  const handler = routes[fieldName];
  if (!handler) {
    throw new Error(`Unsupported ${scope} resolver: ${fieldName}`);
  }
  return handler(event, {} as never, () => undefined);
};
