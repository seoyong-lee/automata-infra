import {
  classifyPipelineExecutionFailure,
  finishJobExecution,
  markJobExecutionRunning,
  type JobExecutionStageType,
  type PipelineExecutionStepType,
} from "../../../../shared/lib/store/job-execution";
import { getJobOrThrow } from "../../../shared/repo/job-draft-store";
import type { AssetGenerationScope } from "../../../generations/run-asset-generation/usecase/run-asset-generation";
import type { FinalCompositionScope } from "../../../final/run-final-composition/usecase/run-final-composition";
import {
  executePipelineStage,
  resolvePipelineStageOutputArtifactS3Key,
} from "./pipeline-stage-rules";

class PipelineStageTimeoutError extends Error {
  constructor(stepType: PipelineExecutionStepType, maxRuntimeSec: number) {
    super(`pipeline step ${stepType} timed out after ${maxRuntimeSec}s`);
    this.name = "PipelineStageTimeoutError";
  }
}

const runWithTimeout = async <TResult>(
  run: () => Promise<TResult>,
  stepType: PipelineExecutionStepType,
  maxRuntimeSec: number,
): Promise<TResult> => {
  let timeoutHandle: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      run(),
      new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new PipelineStageTimeoutError(stepType, maxRuntimeSec));
        }, maxRuntimeSec * 1000);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
};

export const runPipelineStage = async (input: {
  jobId: string;
  executionSk: string;
  stage: JobExecutionStageType;
  stepType?: PipelineExecutionStepType;
  assetGenScope?: AssetGenerationScope;
  finalCompositionScope?: FinalCompositionScope;
}): Promise<void> => {
  const claimedExecution = await markJobExecutionRunning({
    jobId: input.jobId,
    sk: input.executionSk,
  });
  if (!claimedExecution) {
    return;
  }
  const stepType = input.stepType ?? claimedExecution.stepType;
  try {
    await runWithTimeout(
      () => executePipelineStage(input),
      stepType,
      claimedExecution.maxRuntimeSec,
    );
    const job = await getJobOrThrow(input.jobId);
    const outputArtifactS3Key = resolvePipelineStageOutputArtifactS3Key(
      input.stage,
      job,
    );
    await finishJobExecution({
      jobId: input.jobId,
      sk: input.executionSk,
      status: "SUCCEEDED",
      ...(outputArtifactS3Key ? { outputArtifactS3Key } : {}),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const failure = classifyPipelineExecutionFailure(e);
    await finishJobExecution({
      jobId: input.jobId,
      sk: input.executionSk,
      status: failure.failureType === "TIMEOUT" ? "TIMED_OUT" : "FAILED",
      errorMessage: msg,
      failureType: failure.failureType,
      failureCode: failure.failureCode,
      retryable: failure.retryable,
    });
    throw e;
  }
};
