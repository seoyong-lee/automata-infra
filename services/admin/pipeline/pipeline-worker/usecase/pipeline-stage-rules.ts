import type { JobExecutionStageType } from "../../../../shared/lib/store/job-execution";
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

export type PipelineStageExecutionInput = {
  jobId: string;
  executionSk: string;
  stage: JobExecutionStageType;
  assetGenScope?: AssetGenerationScope;
  finalCompositionScope?: FinalCompositionScope;
};

export const executePipelineStage = async (
  input: PipelineStageExecutionInput,
): Promise<void> => {
  if (input.stage === "JOB_PLAN") {
    await runJobPlanCore(input.jobId);
    return;
  }
  if (input.stage === "SCENE_JSON") {
    await runSceneJsonCore(input.jobId);
    return;
  }
  if (input.stage === "FINAL_COMPOSITION") {
    await runFinalCompositionCore(input.jobId, input.finalCompositionScope, {
      executionSk: input.executionSk,
    });
    return;
  }
  await runAssetGenerationCore(
    input.jobId,
    input.assetGenScope ?? DEFAULT_ASSET_GENERATION_SCOPE,
  );
};

export const resolvePipelineStageOutputArtifactS3Key = (
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
