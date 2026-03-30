import type { Handler } from "aws-lambda";

import type {
  JobExecutionStageType,
  PipelineExecutionStepType,
} from "../../../shared/lib/store/job-execution";
import type { AssetGenerationScope } from "../../generations/run-asset-generation/usecase/run-asset-generation";
import type { FinalCompositionScope } from "../../final/run-final-composition/usecase/run-final-composition";
import { runPipelineStage } from "./usecase/run-pipeline-stage";

type PipelineWorkerEvent = {
  jobId: string;
  executionSk: string;
  stage: JobExecutionStageType;
  stepType?: PipelineExecutionStepType;
  assetGenScope?: AssetGenerationScope;
  finalCompositionScope?: FinalCompositionScope;
};

export const run: Handler<PipelineWorkerEvent, void> = async (event) => {
  const {
    jobId,
    executionSk,
    stage,
    stepType,
    assetGenScope,
    finalCompositionScope,
  } = event ?? {};
  if (!jobId || !executionSk || !stage) {
    throw new Error("invalid pipeline worker payload");
  }
  await runPipelineStage({
    jobId,
    executionSk,
    stage,
    stepType,
    assetGenScope,
    finalCompositionScope,
  });
};
