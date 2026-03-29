import {
  finishJobExecution,
  markJobExecutionRunning,
  type JobExecutionStageType,
} from "../../../../shared/lib/store/job-execution";
import { getJobOrThrow } from "../../../shared/repo/job-draft-store";
import type { AssetGenerationScope } from "../../../generations/run-asset-generation/usecase/run-asset-generation";
import type { FinalCompositionScope } from "../../../final/run-final-composition/usecase/run-final-composition";
import {
  executePipelineStage,
  resolvePipelineStageOutputArtifactS3Key,
} from "./pipeline-stage-rules";

export const runPipelineStage = async (input: {
  jobId: string;
  executionSk: string;
  stage: JobExecutionStageType;
  assetGenScope?: AssetGenerationScope;
  finalCompositionScope?: FinalCompositionScope;
}): Promise<void> => {
  await markJobExecutionRunning(input.jobId, input.executionSk);
  try {
    await executePipelineStage(input);
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
    await finishJobExecution({
      jobId: input.jobId,
      sk: input.executionSk,
      status: "FAILED",
      errorMessage: msg,
    });
    throw e;
  }
};
