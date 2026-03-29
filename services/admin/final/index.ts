import { Handler } from "aws-lambda";
import { run as cancelFinalComposition } from "./cancel-final-composition";
import { run as runFinalComposition } from "./run-final-composition";
import { run as selectRenderArtifact } from "./select-render-artifact";
import {
  dispatchGroupedResolver,
  type GroupedResolverRoutes,
} from "../shared/grouped-router";
import { type GroupedGraphqlResolverEvent } from "../shared/graphql-event";

const routes: GroupedResolverRoutes = {
  cancelFinalComposition,
  runFinalComposition,
  selectRenderArtifact,
};

export const run: Handler<GroupedGraphqlResolverEvent, unknown> = async (
  event,
) => {
  return dispatchGroupedResolver(event, routes, "final");
};
