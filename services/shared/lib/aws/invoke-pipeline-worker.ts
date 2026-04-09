import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

import type {
  JobExecutionStageType,
  PipelineExecutionStepType,
} from "../store/job-execution";

const client = new LambdaClient({});

export type PipelineWorkerAssetGenScope = {
  targetSceneId?: number;
  modality: "all" | "image" | "voice" | "video";
  imageProvider?: "openai" | "byteplus";
  /** TTS 프로필 오버라이드(runAssetGeneration). */
  voiceProfileId?: string;
};

export type PipelineWorkerFinalCompositionScope = {
  burnInSubtitles?: boolean;
};

export type InvokePipelineWorkerAsyncInput = {
  jobId: string;
  executionSk: string;
  stage: JobExecutionStageType;
  stepType?: PipelineExecutionStepType;
  assetGenScope?: PipelineWorkerAssetGenScope;
  finalCompositionScope?: PipelineWorkerFinalCompositionScope;
  /**
   * `assetGenScope.voiceProfileId`와 동일 값을 최상위에 한 번 더 실어 보낸다.
   * 일부 경로에서 중첩 객체 필드가 유실되는 경우에도 TTS 프로필이 적용되게 한다.
   */
  pipelineWorkerVoiceProfileId?: string;
};

export const invokePipelineWorkerAsync = async (
  input: InvokePipelineWorkerAsyncInput,
): Promise<void> => {
  const fn = process.env.PIPELINE_WORKER_FUNCTION_NAME?.trim();
  if (!fn) {
    throw new Error("PIPELINE_WORKER_FUNCTION_NAME is not configured");
  }
  const {
    jobId,
    executionSk,
    stage,
    stepType,
    assetGenScope,
    finalCompositionScope,
    pipelineWorkerVoiceProfileId,
    ...passThrough
  } = input;
  const core: Record<string, unknown> = {
    jobId,
    executionSk,
    stage,
    ...(stepType ? { stepType } : {}),
    ...(assetGenScope !== null ? { assetGenScope } : {}),
    ...(finalCompositionScope !== null ? { finalCompositionScope } : {}),
    ...(typeof pipelineWorkerVoiceProfileId === "string" &&
    pipelineWorkerVoiceProfileId.trim().length > 0
      ? {
          pipelineWorkerVoiceProfileId: pipelineWorkerVoiceProfileId.trim(),
        }
      : {}),
  };
  await client.send(
    new InvokeCommand({
      FunctionName: fn,
      InvocationType: "Event",
      Payload: Buffer.from(JSON.stringify({ ...core, ...passThrough })),
    }),
  );
};
