import { randomUUID } from "node:crypto";

import { getItem, putItem, queryItems, updateItem } from "../aws/runtime";
import {
  classifyPipelineExecutionFailure,
  isTerminalJobExecutionStatus,
  resolveDefaultExecutionLeaseDurationSec,
  resolveDefaultExecutionMaxAttempts,
  resolveDefaultExecutionMaxRuntimeSec,
  resolveDefaultPipelineStepType,
  resolveExecutionDeadlineAt,
  resolveExecutionLeaseExpiresAt,
  type JobExecutionFailureType,
  type JobExecutionStageType,
  type JobExecutionStatus,
  type PipelineExecutionStepType,
} from "../contracts/pipeline-execution";

const jobPk = (jobId: string): string => `JOB#${jobId}`;
export {
  classifyPipelineExecutionFailure,
  isTerminalJobExecutionStatus,
  resolveDefaultExecutionLeaseDurationSec,
  resolveDefaultExecutionMaxAttempts,
  resolveDefaultExecutionMaxRuntimeSec,
  resolveDefaultPipelineStepType,
  resolveExecutionDeadlineAt,
  resolveExecutionLeaseExpiresAt,
} from "../contracts/pipeline-execution";
export type {
  JobExecutionFailureType,
  JobExecutionStageType,
  JobExecutionStatus,
  PipelineExecutionStepType,
} from "../contracts/pipeline-execution";

const isConditionalCheckFailed = (error: unknown): boolean => {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "ConditionalCheckFailedException"
  );
};

export type JobExecutionRow = {
  PK: string;
  SK: string;
  executionId: string;
  jobId: string;
  stageType: JobExecutionStageType;
  stepType: PipelineExecutionStepType;
  status: JobExecutionStatus;
  attemptCount: number;
  maxAttempts: number;
  maxRuntimeSec: number;
  triggeredBy?: string;
  startedAt: string;
  deadlineAt?: string;
  lastHeartbeatAt?: string;
  leaseExpiresAt?: string;
  completedAt?: string;
  timedOutAt?: string;
  errorMessage?: string;
  failureType?: JobExecutionFailureType;
  failureCode?: string;
  retryable?: boolean;
  nextRetryAt?: string;
  providerTaskArn?: string | null;
  /** 해당 실행의 입력 기준(예: 브리프·플랜·씬 JSON S3 키). 승인 스냅샷 ID로 확장 가능. */
  inputSnapshotId?: string;
  /** 성공 시 산출물 기준(예: 플랜·씬 JSON S3 키). 채택 UI 연결용. */
  outputArtifactS3Key?: string;
};

const resolveFailureMetadata = (input: {
  errorMessage?: string;
  failureType?: JobExecutionFailureType;
  failureCode?: string;
  retryable?: boolean;
}) => {
  const classified = classifyPipelineExecutionFailure(input.errorMessage);
  return {
    failureType: input.failureType ?? classified.failureType,
    failureCode: input.failureCode ?? classified.failureCode,
    retryable: input.retryable ?? classified.retryable,
  };
};

const buildSuccessUpdate = (input: {
  key: { PK: string; SK: string };
  completedAt: string;
  outputArtifactS3Key?: string;
}) => {
  const expressionAttributeNames: Record<string, string> = {
    "#s": "status",
    "#completedAt": "completedAt",
    "#err": "errorMessage",
    "#failureType": "failureType",
    "#failureCode": "failureCode",
    "#retryable": "retryable",
    "#nextRetryAt": "nextRetryAt",
    "#timedOutAt": "timedOutAt",
    "#leaseExpiresAt": "leaseExpiresAt",
  };
  const expressionAttributeValues: Record<string, unknown> = {
    ":s": "SUCCEEDED",
    ":c": input.completedAt,
  };
  let updateExpression =
    "SET #s = :s, #completedAt = :c REMOVE #err, #failureType, #failureCode, #retryable, #nextRetryAt, #timedOutAt, #leaseExpiresAt";
  if (input.outputArtifactS3Key) {
    expressionAttributeNames["#out"] = "outputArtifactS3Key";
    expressionAttributeValues[":o"] = input.outputArtifactS3Key;
    updateExpression =
      "SET #s = :s, #completedAt = :c, #out = :o REMOVE #err, #failureType, #failureCode, #retryable, #nextRetryAt, #timedOutAt, #leaseExpiresAt";
  }
  return updateItem({
    key: input.key,
    updateExpression,
    expressionAttributeNames,
    expressionAttributeValues,
  });
};

const buildFailureUpdate = (input: {
  key: { PK: string; SK: string };
  status: "FAILED" | "TIMED_OUT";
  errorMessage?: string;
  completedAt: string;
  failureType?: JobExecutionFailureType;
  failureCode?: string;
  retryable?: boolean;
  nextRetryAt?: string;
}) => {
  const failure = resolveFailureMetadata(input);
  return updateItem({
    key: input.key,
    updateExpression:
      "SET #s = :s, #completedAt = :c, #err = :e, #failureType = :failureType, #failureCode = :failureCode, #retryable = :retryable, #leaseExpiresAt = :leaseExpiresAt, #nextRetryAt = :nextRetryAt, #timedOutAt = :timedOutAt",
    expressionAttributeNames: {
      "#s": "status",
      "#completedAt": "completedAt",
      "#err": "errorMessage",
      "#failureType": "failureType",
      "#failureCode": "failureCode",
      "#retryable": "retryable",
      "#leaseExpiresAt": "leaseExpiresAt",
      "#nextRetryAt": "nextRetryAt",
      "#timedOutAt": "timedOutAt",
    },
    expressionAttributeValues: {
      ":s": input.status,
      ":c": input.completedAt,
      ":e": input.errorMessage ?? "unknown error",
      ":failureType": failure.failureType,
      ":failureCode": failure.failureCode,
      ":retryable": failure.retryable,
      ":leaseExpiresAt": input.completedAt,
      ":nextRetryAt": input.nextRetryAt ?? null,
      ":timedOutAt": input.status === "TIMED_OUT" ? input.completedAt : null,
    },
  });
};

const resolveExecutionRuntimeConfig = (input: {
  stageType: JobExecutionStageType;
  maxAttempts?: number;
  maxRuntimeSec?: number;
}) => {
  return {
    maxAttempts:
      input.maxAttempts ?? resolveDefaultExecutionMaxAttempts(input.stageType),
    maxRuntimeSec:
      input.maxRuntimeSec ??
      resolveDefaultExecutionMaxRuntimeSec(input.stageType),
  };
};

const buildRunningClaim = (input: {
  jobId: string;
  sk: string;
  current: JobExecutionRow;
}) => {
  const now = new Date().toISOString();
  const maxRuntimeSec =
    input.current.maxRuntimeSec ||
    resolveDefaultExecutionMaxRuntimeSec(input.current.stageType);
  const maxAttempts =
    input.current.maxAttempts ||
    resolveDefaultExecutionMaxAttempts(input.current.stageType);
  const nextAttemptCount = (input.current.attemptCount ?? 0) + 1;
  const leaseDurationSec = resolveDefaultExecutionLeaseDurationSec(
    input.current.stageType,
  );
  return {
    now,
    maxRuntimeSec,
    maxAttempts,
    nextAttemptCount,
    deadlineAt: resolveExecutionDeadlineAt({
      startedAt: now,
      maxRuntimeSec,
    }),
    leaseExpiresAt: resolveExecutionLeaseExpiresAt({
      startedAt: now,
      leaseDurationSec,
    }),
  };
};

const buildExecutionRow = (input: {
  jobId: string;
  executionId: string;
  sk: string;
  stageType: JobExecutionStageType;
  stepType?: PipelineExecutionStepType;
  status: "RUNNING" | "QUEUED";
  attemptCount: number;
  triggeredBy?: string;
  startedAt: string;
  inputSnapshotId?: string;
  maxAttempts?: number;
  maxRuntimeSec?: number;
}): JobExecutionRow => {
  const runtime = resolveExecutionRuntimeConfig(input);
  return {
    PK: jobPk(input.jobId),
    SK: input.sk,
    executionId: input.executionId,
    jobId: input.jobId,
    stageType: input.stageType,
    stepType: input.stepType ?? resolveDefaultPipelineStepType(input.stageType),
    status: input.status,
    attemptCount: input.attemptCount,
    maxAttempts: runtime.maxAttempts,
    maxRuntimeSec: runtime.maxRuntimeSec,
    triggeredBy: input.triggeredBy,
    startedAt: input.startedAt,
    ...(input.status === "RUNNING"
      ? {
          deadlineAt: resolveExecutionDeadlineAt({
            startedAt: input.startedAt,
            maxRuntimeSec: runtime.maxRuntimeSec,
          }),
          lastHeartbeatAt: input.startedAt,
          leaseExpiresAt: resolveExecutionLeaseExpiresAt({
            startedAt: input.startedAt,
            leaseDurationSec: resolveDefaultExecutionLeaseDurationSec(
              input.stageType,
            ),
          }),
        }
      : {}),
    ...(input.inputSnapshotId
      ? { inputSnapshotId: input.inputSnapshotId }
      : {}),
  };
};

const buildExecutionFinish = (input: { jobId: string; sk: string }) => {
  return async (
    status: "SUCCEEDED" | "FAILED" | "TIMED_OUT",
    errorMessage?: string,
    outputArtifactS3Key?: string,
    failure?: {
      failureType?: JobExecutionFailureType;
      failureCode?: string;
      retryable?: boolean;
      nextRetryAt?: string;
    },
  ) => {
    await finishJobExecution({
      jobId: input.jobId,
      sk: input.sk,
      status,
      errorMessage,
      outputArtifactS3Key:
        status === "SUCCEEDED" ? outputArtifactS3Key : undefined,
      failureType: failure?.failureType,
      failureCode: failure?.failureCode,
      retryable: failure?.retryable,
      nextRetryAt: failure?.nextRetryAt,
    });
  };
};

export const finishJobExecution = async (input: {
  jobId: string;
  sk: string;
  status: "SUCCEEDED" | "FAILED" | "TIMED_OUT";
  errorMessage?: string;
  outputArtifactS3Key?: string;
  failureType?: JobExecutionFailureType;
  failureCode?: string;
  retryable?: boolean;
  nextRetryAt?: string;
}): Promise<void> => {
  const current = await getJobExecutionBySk(input.jobId, input.sk);
  if (!current || current.status === "CANCELLED") {
    return;
  }
  const completedAt = new Date().toISOString();
  const key = { PK: jobPk(input.jobId), SK: input.sk };
  if (input.status === "SUCCEEDED") {
    await buildSuccessUpdate({
      key,
      completedAt,
      outputArtifactS3Key: input.outputArtifactS3Key,
    });
    return;
  }
  await buildFailureUpdate({
    key,
    status: input.status,
    errorMessage: input.errorMessage,
    completedAt,
    failureType: input.failureType,
    failureCode: input.failureCode,
    retryable: input.retryable,
    nextRetryAt: input.nextRetryAt,
  });
};

export const markJobExecutionRunning = async (input: {
  jobId: string;
  sk: string;
}): Promise<JobExecutionRow | null> => {
  const current = await getJobExecutionBySk(input.jobId, input.sk);
  if (!current || isTerminalJobExecutionStatus(current.status)) {
    return null;
  }
  if (current.status === "RUNNING") {
    return null;
  }
  const runningClaim = buildRunningClaim({
    jobId: input.jobId,
    sk: input.sk,
    current,
  });
  if (runningClaim.nextAttemptCount > runningClaim.maxAttempts) {
    return null;
  }

  try {
    await updateItem({
      key: { PK: jobPk(input.jobId), SK: input.sk },
      updateExpression:
        "SET #s = :s, #attemptCount = :attemptCount, #lastHeartbeatAt = :lastHeartbeatAt, #leaseExpiresAt = :leaseExpiresAt, #deadlineAt = :deadlineAt REMOVE #completedAt, #timedOutAt",
      expressionAttributeNames: {
        "#s": "status",
        "#attemptCount": "attemptCount",
        "#lastHeartbeatAt": "lastHeartbeatAt",
        "#leaseExpiresAt": "leaseExpiresAt",
        "#deadlineAt": "deadlineAt",
        "#completedAt": "completedAt",
        "#timedOutAt": "timedOutAt",
      },
      expressionAttributeValues: {
        ":s": "RUNNING",
        ":attemptCount": runningClaim.nextAttemptCount,
        ":lastHeartbeatAt": runningClaim.now,
        ":leaseExpiresAt": runningClaim.leaseExpiresAt,
        ":deadlineAt": runningClaim.deadlineAt,
        ":queued": "QUEUED",
      },
      conditionExpression: "#s = :queued",
    });
  } catch (error) {
    if (isConditionalCheckFailed(error)) {
      return null;
    }
    throw error;
  }

  return {
    ...current,
    status: "RUNNING",
    attemptCount: runningClaim.nextAttemptCount,
    maxAttempts: runningClaim.maxAttempts,
    maxRuntimeSec: runningClaim.maxRuntimeSec,
    deadlineAt: runningClaim.deadlineAt,
    lastHeartbeatAt: runningClaim.now,
    leaseExpiresAt: runningClaim.leaseExpiresAt,
  };
};

export const getJobExecutionBySk = async (
  jobId: string,
  sk: string,
): Promise<JobExecutionRow | null> => {
  return getItem<JobExecutionRow>({
    PK: jobPk(jobId),
    SK: sk,
  });
};

export const setJobExecutionProviderTaskArn = async (input: {
  jobId: string;
  sk: string;
  providerTaskArn: string;
}): Promise<void> => {
  await updateItem({
    key: { PK: jobPk(input.jobId), SK: input.sk },
    updateExpression: "SET #task = :task",
    expressionAttributeNames: {
      "#task": "providerTaskArn",
    },
    expressionAttributeValues: {
      ":task": input.providerTaskArn,
    },
  });
};

export const cancelJobExecution = async (input: {
  jobId: string;
  sk: string;
  errorMessage?: string;
}): Promise<void> => {
  await updateItem({
    key: { PK: jobPk(input.jobId), SK: input.sk },
    updateExpression:
      "SET #s = :s, #completedAt = :c, #err = :e REMOVE #out, #leaseExpiresAt, #nextRetryAt, #timedOutAt",
    expressionAttributeNames: {
      "#s": "status",
      "#completedAt": "completedAt",
      "#err": "errorMessage",
      "#out": "outputArtifactS3Key",
      "#leaseExpiresAt": "leaseExpiresAt",
      "#nextRetryAt": "nextRetryAt",
      "#timedOutAt": "timedOutAt",
    },
    expressionAttributeValues: {
      ":s": "CANCELLED",
      ":c": new Date().toISOString(),
      ":e": input.errorMessage ?? "cancelled by user",
    },
  });
};

export const startJobExecution = async (input: {
  jobId: string;
  stageType: JobExecutionStageType;
  stepType?: PipelineExecutionStepType;
  triggeredBy?: string;
  /** 해당 단계 실행 시점의 입력 스냅샷(예: S3 object key). */
  inputSnapshotId?: string;
  maxAttempts?: number;
  maxRuntimeSec?: number;
}): Promise<{
  finish: (
    status: "SUCCEEDED" | "FAILED" | "TIMED_OUT",
    errorMessage?: string,
    outputArtifactS3Key?: string,
    failure?: {
      failureType?: JobExecutionFailureType;
      failureCode?: string;
      retryable?: boolean;
      nextRetryAt?: string;
    },
  ) => Promise<void>;
}> => {
  const executionId = randomUUID();
  const startedAt = new Date().toISOString();
  const SK = `EXEC#${startedAt}#${executionId}`;
  const row = buildExecutionRow({
    jobId: input.jobId,
    executionId,
    sk: SK,
    stageType: input.stageType,
    stepType: input.stepType,
    status: "RUNNING",
    attemptCount: 1,
    triggeredBy: input.triggeredBy,
    startedAt,
    inputSnapshotId: input.inputSnapshotId,
    maxAttempts: input.maxAttempts,
    maxRuntimeSec: input.maxRuntimeSec,
  });
  await putItem(row as unknown as Record<string, unknown>);

  return {
    finish: buildExecutionFinish({ jobId: input.jobId, sk: SK }),
  };
};

export const startQueuedJobExecution = async (input: {
  jobId: string;
  stageType: JobExecutionStageType;
  stepType?: PipelineExecutionStepType;
  triggeredBy?: string;
  inputSnapshotId?: string;
  maxAttempts?: number;
  maxRuntimeSec?: number;
}): Promise<{
  executionId: string;
  sk: string;
  finish: (
    status: "SUCCEEDED" | "FAILED" | "TIMED_OUT",
    errorMessage?: string,
    outputArtifactS3Key?: string,
    failure?: {
      failureType?: JobExecutionFailureType;
      failureCode?: string;
      retryable?: boolean;
      nextRetryAt?: string;
    },
  ) => Promise<void>;
}> => {
  const executionId = randomUUID();
  const startedAt = new Date().toISOString();
  const SK = `EXEC#${startedAt}#${executionId}`;
  const row = buildExecutionRow({
    jobId: input.jobId,
    executionId,
    sk: SK,
    stageType: input.stageType,
    stepType: input.stepType,
    status: "QUEUED",
    attemptCount: 0,
    triggeredBy: input.triggeredBy,
    startedAt,
    inputSnapshotId: input.inputSnapshotId,
    maxAttempts: input.maxAttempts,
    maxRuntimeSec: input.maxRuntimeSec,
  });
  await putItem(row as unknown as Record<string, unknown>);

  return {
    executionId,
    sk: SK,
    finish: buildExecutionFinish({ jobId: input.jobId, sk: SK }),
  };
};

export const listJobExecutionRows = async (
  jobId: string,
): Promise<JobExecutionRow[]> => {
  const items = await queryItems<JobExecutionRow>({
    keyConditionExpression: "PK = :pk AND begins_with(SK, :exec)",
    expressionAttributeValues: {
      ":pk": jobPk(jobId),
      ":exec": "EXEC#",
    },
    scanIndexForward: false,
    limit: 500,
  });
  return items;
};

export const getJobExecutionByExecutionId = async (
  jobId: string,
  executionId: string,
): Promise<JobExecutionRow | undefined> => {
  const rows = await listJobExecutionRows(jobId);
  return rows.find((r) => r.executionId === executionId);
};
