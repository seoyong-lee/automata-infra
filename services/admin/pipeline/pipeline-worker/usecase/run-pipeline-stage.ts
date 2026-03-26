import {
  finishJobExecution,
  markJobExecutionRunning,
  type JobExecutionStageType,
} from "../../../../shared/lib/store/job-execution";
import { getJobOrThrow } from "../../../shared/repo/job-draft-store";
import {
  runAssetGenerationCore,
  type AssetGenerationScope,
} from "../../../generations/run-asset-generation/usecase/run-asset-generation";
import {
  runFinalCompositionCore,
  type FinalCompositionScope,
} from "../../../final/run-final-composition/usecase/run-final-composition";
import { runSceneJsonCore } from "../../../generations/run-scene-json/usecase/run-scene-json";
import { runJobPlanCore } from "../../../generations/run-job-plan/usecase/run-job-plan";

const DEFAULT_ASSET_GENERATION_SCOPE: AssetGenerationScope = {
  modality: "all",
};

const executeStage = async (input: {
  jobId: string;
  stage: JobExecutionStageType;
  assetGenScope?: AssetGenerationScope;
  finalCompositionScope?: FinalCompositionScope;
}): Promise<void> => {
  if (input.stage === "JOB_PLAN") {
    await runJobPlanCore(input.jobId);
    return;
  }
  if (input.stage === "SCENE_JSON") {
    await runSceneJsonCore(input.jobId);
    return;
  }
  if (input.stage === "FINAL_COMPOSITION") {
    await runFinalCompositionCore(input.jobId, input.finalCompositionScope);
    return;
  }
  await runAssetGenerationCore(
    input.jobId,
    input.assetGenScope ?? DEFAULT_ASSET_GENERATION_SCOPE,
  );
};

const resolveOutputArtifactS3Key = (
  stage: JobExecutionStageType,
  job: Awaited<ReturnType<typeof getJobOrThrow>>,
): string | undefined => {
  if (stage === "JOB_PLAN") {
    return job.jobPlanS3Key;
  }
  if (stage === "SCENE_JSON") {
    return job.sceneJsonS3Key;
  }
  if (stage === "FINAL_COMPOSITION") {
    return job.finalVideoS3Key ?? job.previewS3Key;
  }
  return job.assetManifestS3Key ?? job.sceneJsonS3Key;
};

export const runPipelineStage = async (input: {
  jobId: string;
  executionSk: string;
  stage: JobExecutionStageType;
  assetGenScope?: AssetGenerationScope;
  finalCompositionScope?: FinalCompositionScope;
}): Promise<void> => {
  await markJobExecutionRunning(input.jobId, input.executionSk);
  try {
    await executeStage(input);
    const job = await getJobOrThrow(input.jobId);
    const outputArtifactS3Key = resolveOutputArtifactS3Key(input.stage, job);
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
  }
};
