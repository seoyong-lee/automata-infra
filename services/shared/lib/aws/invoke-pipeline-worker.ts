import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

import type { JobExecutionStageType } from "../store/job-execution";

const client = new LambdaClient({});

export type PipelineWorkerAssetGenScope = {
  targetSceneId?: number;
  modality: "all" | "image" | "voice" | "video";
  imageProvider?: "openai" | "byteplus";
};

export type PipelineWorkerFinalCompositionScope = {
  burnInSubtitles?: boolean;
};

export const invokePipelineWorkerAsync = async (input: {
  jobId: string;
  executionSk: string;
  stage: JobExecutionStageType;
  assetGenScope?: PipelineWorkerAssetGenScope;
  finalCompositionScope?: PipelineWorkerFinalCompositionScope;
}): Promise<void> => {
  const fn = process.env.PIPELINE_WORKER_FUNCTION_NAME?.trim();
  if (!fn) {
    throw new Error("PIPELINE_WORKER_FUNCTION_NAME is not configured");
  }
  await client.send(
    new InvokeCommand({
      FunctionName: fn,
      InvocationType: "Event",
      Payload: Buffer.from(
        JSON.stringify({
          jobId: input.jobId,
          executionSk: input.executionSk,
          stage: input.stage,
          ...(input.assetGenScope
            ? { assetGenScope: input.assetGenScope }
            : {}),
          ...(input.finalCompositionScope
            ? { finalCompositionScope: input.finalCompositionScope }
            : {}),
        }),
      ),
    }),
  );
};
