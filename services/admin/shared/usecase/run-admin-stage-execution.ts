import { invokePipelineWorkerAsync } from "../../../shared/lib/aws/invoke-pipeline-worker";
import {
  classifyPipelineExecutionFailure,
  type PipelineExecutionStepType,
  type JobExecutionStageType,
  startJobExecution,
  startQueuedJobExecution,
} from "../../../shared/lib/store/job-execution";

const isPipelineAsyncEnabled = (): boolean =>
  (process.env.PIPELINE_ASYNC_INVOCATION === "1" ||
    process.env.PIPELINE_ASYNC_INVOCATION === "true") &&
  Boolean(process.env.PIPELINE_WORKER_FUNCTION_NAME?.trim());

export const runAdminStageExecution = async <TResult>(input: {
  jobId: string;
  stageType: JobExecutionStageType;
  stepType?: PipelineExecutionStepType;
  triggeredBy?: string;
  inputSnapshotId?: string;
  workerPayload?: Record<string, unknown>;
  runCore: () => Promise<TResult>;
  getQueuedResult: () => Promise<TResult>;
  getSuccessSnapshot?: (result: TResult) => string | undefined;
  onAsyncInvokeError?: (message: string) => Promise<void>;
  onSyncError?: (message: string) => Promise<void>;
  maxAttempts?: number;
  maxRuntimeSec?: number;
}): Promise<TResult> => {
  if (isPipelineAsyncEnabled()) {
    const { sk, finish } = await startQueuedJobExecution({
      jobId: input.jobId,
      stageType: input.stageType,
      stepType: input.stepType,
      triggeredBy: input.triggeredBy,
      inputSnapshotId: input.inputSnapshotId,
      maxAttempts: input.maxAttempts,
      maxRuntimeSec: input.maxRuntimeSec,
    });
    try {
      await invokePipelineWorkerAsync({
        jobId: input.jobId,
        executionSk: sk,
        stage: input.stageType,
        stepType: input.stepType,
        ...(input.workerPayload ?? {}),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const failure = classifyPipelineExecutionFailure(error);
      await input.onAsyncInvokeError?.(message);
      await finish("FAILED", message, undefined, failure);
      throw error;
    }
    return input.getQueuedResult();
  }

  const { finish } = await startJobExecution({
    jobId: input.jobId,
    stageType: input.stageType,
    stepType: input.stepType,
    triggeredBy: input.triggeredBy,
    inputSnapshotId: input.inputSnapshotId,
    maxAttempts: input.maxAttempts,
    maxRuntimeSec: input.maxRuntimeSec,
  });
  try {
    const result = await input.runCore();
    await finish("SUCCEEDED", undefined, input.getSuccessSnapshot?.(result));
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failure = classifyPipelineExecutionFailure(error);
    await input.onSyncError?.(message);
    await finish("FAILED", message, undefined, failure);
    throw error;
  }
};
