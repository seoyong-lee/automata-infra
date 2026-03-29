import { invokePipelineWorkerAsync } from "../../../shared/lib/aws/invoke-pipeline-worker";
import {
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
  triggeredBy?: string;
  inputSnapshotId?: string;
  workerPayload?: Record<string, unknown>;
  runCore: () => Promise<TResult>;
  getQueuedResult: () => Promise<TResult>;
  getSuccessSnapshot?: (result: TResult) => string | undefined;
  onAsyncInvokeError?: (message: string) => Promise<void>;
  onSyncError?: (message: string) => Promise<void>;
}): Promise<TResult> => {
  if (isPipelineAsyncEnabled()) {
    const { sk, finish } = await startQueuedJobExecution({
      jobId: input.jobId,
      stageType: input.stageType,
      triggeredBy: input.triggeredBy,
      inputSnapshotId: input.inputSnapshotId,
    });
    try {
      await invokePipelineWorkerAsync({
        jobId: input.jobId,
        executionSk: sk,
        stage: input.stageType,
        ...(input.workerPayload ?? {}),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await input.onAsyncInvokeError?.(message);
      await finish("FAILED", message);
      throw error;
    }
    return input.getQueuedResult();
  }

  const { finish } = await startJobExecution({
    jobId: input.jobId,
    stageType: input.stageType,
    triggeredBy: input.triggeredBy,
    inputSnapshotId: input.inputSnapshotId,
  });
  try {
    const result = await input.runCore();
    await finish("SUCCEEDED", undefined, input.getSuccessSnapshot?.(result));
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await input.onSyncError?.(message);
    await finish("FAILED", message);
    throw error;
  }
};
