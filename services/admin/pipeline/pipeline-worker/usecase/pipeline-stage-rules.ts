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

const mergeAssetGenScopeForPipelineWorker = (
  raw: AssetGenerationScope | undefined,
  pipelineWorkerVoiceProfileId: unknown,
): AssetGenerationScope => {
  const pipe =
    typeof pipelineWorkerVoiceProfileId === "string"
      ? pipelineWorkerVoiceProfileId.trim()
      : "";
  const base = raw ?? DEFAULT_ASSET_GENERATION_SCOPE;
  if (!pipe) {
    return base;
  }
  return {
    ...DEFAULT_ASSET_GENERATION_SCOPE,
    ...base,
    voiceProfileId: pipe,
  };
};

export type PipelineStageExecutionInput = {
  jobId: string;
  executionSk: string;
  stage: JobExecutionStageType;
  assetGenScope?: AssetGenerationScope;
  /** `invokePipelineWorkerAsync`가 최상위로 중복 실어 보낸 TTS 프로필 id */
  pipelineWorkerVoiceProfileId?: string;
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
    mergeAssetGenScopeForPipelineWorker(
      input.assetGenScope,
      input.pipelineWorkerVoiceProfileId,
    ),
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
