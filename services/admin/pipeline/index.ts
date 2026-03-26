import { Handler } from "aws-lambda";
import { run as approvePipelineExecution } from "./approve-pipeline-execution";
import { run as pipelineWorker } from "./pipeline-worker";
import {
  getGroupedFieldName,
  GroupedGraphqlResolverEvent,
} from "../shared/graphql-event";

type PipelineWorkerEvent = {
  jobId: string;
  executionSk: string;
  stage: string;
  assetGenScope?: unknown;
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

export const run: Handler<
  GroupedGraphqlResolverEvent | PipelineWorkerEvent,
  unknown
> = async (event) => {
  if (isPipelineWorkerEvent(event)) {
    return pipelineWorker(event as never, {} as never, () => undefined);
  }

  const fieldName = getGroupedFieldName(event);
  if (fieldName !== "approvePipelineExecution") {
    throw new Error(`Unsupported pipeline resolver: ${fieldName}`);
  }
  return approvePipelineExecution(event, {} as never, () => undefined);
};
