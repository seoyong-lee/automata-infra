import { Handler } from "aws-lambda";
import { run as runFinalComposition } from "./run-final-composition";
import {
  getGroupedFieldName,
  GroupedGraphqlResolverEvent,
} from "../shared/graphql-event";

export const run: Handler<GroupedGraphqlResolverEvent, unknown> = async (
  event,
) => {
  const fieldName = getGroupedFieldName(event);
  if (fieldName !== "runFinalComposition") {
    throw new Error(`Unsupported final resolver: ${fieldName}`);
  }
  return runFinalComposition(event, {} as never, () => undefined);
};
