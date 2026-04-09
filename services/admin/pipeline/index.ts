import { Handler } from "aws-lambda";
import { run as approvePipelineExecution } from "./approve-pipeline-execution";
import { run as pipelineWorker } from "./pipeline-worker";
import {
  dispatchGroupedResolver,
  type GroupedResolverRoutes,
} from "../shared/grouped-router";
import { type GroupedGraphqlResolverEvent } from "../shared/graphql-event";

type PipelineWorkerEvent = {
  jobId: string;
  executionSk: string;
  stage: string;
  assetGenScope?: unknown;
  pipelineWorkerVoiceProfileId?: string;
  finalCompositionScope?: unknown;
};

const isPipelineWorkerEvent = (
  event: GroupedGraphqlResolverEvent | PipelineWorkerEvent,
): event is PipelineWorkerEvent => {
  const maybe = event as PipelineWorkerEvent;
  return (
    typeof maybe.jobId === "string" &&
    typeof maybe.executionSk === "string" &&
    typeof maybe.stage === "string"
  );
};

const routes: GroupedResolverRoutes = {
  approvePipelineExecution,
};

export const run: Handler<
  GroupedGraphqlResolverEvent | PipelineWorkerEvent,
  unknown
> = async (event) => {
  if (isPipelineWorkerEvent(event)) {
    return pipelineWorker(event as never, {} as never, () => undefined);
  }
  return dispatchGroupedResolver(event, routes, "pipeline");
};
