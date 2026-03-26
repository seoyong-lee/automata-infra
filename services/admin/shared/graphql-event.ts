import { GraphqlResolverEvent } from "./types";

export type GroupedGraphqlResolverEvent = GraphqlResolverEvent<
  Record<string, unknown>
> & {
  info?: {
    fieldName?: string;
    parentTypeName?: string;
  };
};

export const getGroupedFieldName = (
  event: GroupedGraphqlResolverEvent,
): string => {
  const fieldName = event.info?.fieldName?.trim();
  if (!fieldName) {
    throw new Error("Missing GraphQL fieldName");
  }
  return fieldName;
};
