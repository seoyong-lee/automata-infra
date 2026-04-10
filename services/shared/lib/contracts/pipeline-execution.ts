import { z } from "zod";

export const jobExecutionStageTypeSchema = z.enum([
  "JOB_PLAN",
  "SCENE_JSON",
  "ASSET_GENERATION",
  "FINAL_COMPOSITION",
]);
export type JobExecutionStageType = z.infer<typeof jobExecutionStageTypeSchema>;

export const pipelineExecutionStepTypeSchema = z.enum([
  "JOB_PLAN_GENERATE",
  "JOB_PLAN_VALIDATE",
  "SCENE_JSON_GENERATE",
  "SCENE_JSON_VALIDATE",
  "ASSET_TEMPLATE_RESOLVE",
  "ASSET_BIND",
  "ASSET_GENERATE",
  "FINAL_COMPOSITION_PREP",
  "FINAL_COMPOSITION_RENDER",
  "PUBLISH_REQUEST",
]);
export type PipelineExecutionStepType = z.infer<
  typeof pipelineExecutionStepTypeSchema
>;

export const jobExecutionStatusSchema = z.enum([
  "QUEUED",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "TIMED_OUT",
  "CANCELLED",
]);
export type JobExecutionStatus = z.infer<typeof jobExecutionStatusSchema>;

export const pipelineExecutionFailureTypeSchema = z.enum([
  "TIMEOUT",
  "VALIDATION",
  "RATE_LIMIT",
  "PROVIDER",
  "POLICY",
  "INTERNAL",
  "UNKNOWN",
]);
export type PipelineExecutionFailureType = z.infer<
  typeof pipelineExecutionFailureTypeSchema
>;
export type JobExecutionFailureType = PipelineExecutionFailureType;

const DEFAULT_STEP_TYPE_BY_STAGE: Record<
  JobExecutionStageType,
  PipelineExecutionStepType
> = {
  JOB_PLAN: "JOB_PLAN_GENERATE",
  SCENE_JSON: "SCENE_JSON_GENERATE",
  ASSET_GENERATION: "ASSET_GENERATE",
  FINAL_COMPOSITION: "FINAL_COMPOSITION_RENDER",
};

const DEFAULT_MAX_RUNTIME_SEC_BY_STAGE: Record<JobExecutionStageType, number> =
  {
    JOB_PLAN: 300,
    SCENE_JSON: 600,
    /** Lambda 상한 15분과 맞춤. 씬 영상은 generate-scene-videos 병렬화로 벽시계 시간 단축 */
    ASSET_GENERATION: 900,
    FINAL_COMPOSITION: 900,
  };

const DEFAULT_MAX_ATTEMPTS_BY_STAGE: Record<JobExecutionStageType, number> = {
  JOB_PLAN: 3,
  SCENE_JSON: 3,
  ASSET_GENERATION: 3,
  FINAL_COMPOSITION: 2,
};

const DEFAULT_LEASE_DURATION_SEC_BY_STAGE: Record<
  JobExecutionStageType,
  number
> = {
  JOB_PLAN: 330,
  SCENE_JSON: 630,
  ASSET_GENERATION: 930,
  FINAL_COMPOSITION: 930,
};

const toIsoAfterSeconds = (baseIso: string, seconds: number): string => {
  return new Date(new Date(baseIso).getTime() + seconds * 1000).toISOString();
};

export const resolveDefaultPipelineStepType = (
  stageType: JobExecutionStageType,
): PipelineExecutionStepType => DEFAULT_STEP_TYPE_BY_STAGE[stageType];

export const resolveDefaultExecutionMaxRuntimeSec = (
  stageType: JobExecutionStageType,
): number => DEFAULT_MAX_RUNTIME_SEC_BY_STAGE[stageType];

export const resolveDefaultExecutionMaxAttempts = (
  stageType: JobExecutionStageType,
): number => DEFAULT_MAX_ATTEMPTS_BY_STAGE[stageType];

export const resolveDefaultExecutionLeaseDurationSec = (
  stageType: JobExecutionStageType,
): number => DEFAULT_LEASE_DURATION_SEC_BY_STAGE[stageType];

export const resolveExecutionDeadlineAt = (input: {
  startedAt: string;
  maxRuntimeSec: number;
}): string => {
  return toIsoAfterSeconds(input.startedAt, input.maxRuntimeSec);
};

export const resolveExecutionLeaseExpiresAt = (input: {
  startedAt: string;
  leaseDurationSec: number;
}): string => {
  return toIsoAfterSeconds(input.startedAt, input.leaseDurationSec);
};

export const isTerminalJobExecutionStatus = (
  status: JobExecutionStatus,
): boolean =>
  status === "SUCCEEDED" ||
  status === "FAILED" ||
  status === "TIMED_OUT" ||
  status === "CANCELLED";

const messageMatchesAny = (message: string, needles: string[]): boolean => {
  return needles.some((needle) => message.includes(needle));
};

const failureResult = (
  failureType: PipelineExecutionFailureType,
  failureCode: string,
  retryable: boolean,
) => ({
  failureType,
  failureCode,
  retryable,
});

const classifyKnownPipelineFailure = (
  message: string,
):
  | {
      failureType: PipelineExecutionFailureType;
      failureCode: string;
      retryable: boolean;
    }
  | undefined => {
  if (
    messageMatchesAny(message, ["timeout", "timed out", "deadline exceeded"])
  ) {
    return failureResult("TIMEOUT", "PIPELINE_TIMEOUT", true);
  }
  if (messageMatchesAny(message, ["rate limit", "too many requests", "429"])) {
    return failureResult("RATE_LIMIT", "PROVIDER_RATE_LIMIT", true);
  }
  if (
    messageMatchesAny(message, [
      "schema",
      "validation",
      "invalid",
      "malformed json",
    ])
  ) {
    return failureResult("VALIDATION", "OUTPUT_VALIDATION_FAILED", false);
  }
  if (messageMatchesAny(message, ["policy", "safety", "moderation"])) {
    return failureResult("POLICY", "POLICY_BLOCKED", false);
  }
  if (
    messageMatchesAny(message, [
      "provider",
      "openai",
      "bedrock",
      "byteplus",
      "runway",
      "elevenlabs",
      "pexels",
    ])
  ) {
    return failureResult("PROVIDER", "PROVIDER_ERROR", true);
  }
  return undefined;
};

export const classifyPipelineExecutionFailure = (
  error: unknown,
): {
  failureType: PipelineExecutionFailureType;
  failureCode: string;
  retryable: boolean;
} => {
  const message = (
    error instanceof Error ? error.message : String(error)
  ).toLowerCase();
  const knownFailure = classifyKnownPipelineFailure(message);
  if (knownFailure) {
    return knownFailure;
  }
  if (message.trim().length > 0) {
    return failureResult("INTERNAL", "INTERNAL_ERROR", true);
  }
  return failureResult("UNKNOWN", "UNKNOWN_ERROR", false);
};
