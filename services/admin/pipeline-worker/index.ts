import type { Handler } from "aws-lambda";

import type { JobExecutionStageType } from "../../shared/lib/store/job-execution";
import type { AssetGenerationScope } from "../graphql/run-asset-generation/usecase/run-asset-generation";
import type { FinalCompositionScope } from "../graphql/run-final-composition/usecase/run-final-composition";
import { runPipelineStage } from "./usecase/run-pipeline-stage";

type PipelineWorkerEvent = {
  jobId: string;
  executionSk: string;
  stage: JobExecutionStageType;
  assetGenScope?: AssetGenerationScope;
  finalCompositionScope?: FinalCompositionScope;
};

export const run: Handler<PipelineWorkerEvent, void> = async (event) => {
  const { jobId, executionSk, stage, assetGenScope, finalCompositionScope } = event ?? {};
  if (!jobId || !executionSk || !stage) {
    throw new Error("invalid pipeline worker payload");
  }
  await runPipelineStage({
    jobId,
    executionSk,
    stage,
    assetGenScope,
    finalCompositionScope,
  });
};
