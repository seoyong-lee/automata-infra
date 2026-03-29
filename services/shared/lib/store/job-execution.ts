import { randomUUID } from "node:crypto";

import { getItem, putItem, queryItems, updateItem } from "../aws/runtime";

const jobPk = (jobId: string): string => `JOB#${jobId}`;

export type JobExecutionStageType =
  | "JOB_PLAN"
  | "SCENE_JSON"
  | "ASSET_GENERATION"
  | "FINAL_COMPOSITION";

export type JobExecutionStatus =
  | "QUEUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED";

export type JobExecutionRow = {
  PK: string;
  SK: string;
  executionId: string;
  jobId: string;
  stageType: JobExecutionStageType;
  status: JobExecutionStatus;
  triggeredBy?: string;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
  providerTaskArn?: string | null;
  /** 해당 실행의 입력 기준(예: 브리프·플랜·씬 JSON S3 키). 승인 스냅샷 ID로 확장 가능. */
  inputSnapshotId?: string;
  /** 성공 시 산출물 기준(예: 플랜·씬 JSON S3 키). 채택 UI 연결용. */
  outputArtifactS3Key?: string;
};

export const finishJobExecution = async (input: {
  jobId: string;
  sk: string;
  status: "SUCCEEDED" | "FAILED";
  errorMessage?: string;
  outputArtifactS3Key?: string;
}): Promise<void> => {
  const current = await getJobExecutionBySk(input.jobId, input.sk);
  if (!current || current.status === "CANCELLED") {
    return;
  }
  const completedAt = new Date().toISOString();
  const key = { PK: jobPk(input.jobId), SK: input.sk };
  if (input.status === "SUCCEEDED") {
    if (input.outputArtifactS3Key) {
      await updateItem({
        key,
        updateExpression:
          "SET #s = :s, #completedAt = :c, #out = :o REMOVE #err",
        expressionAttributeNames: {
          "#s": "status",
          "#completedAt": "completedAt",
          "#out": "outputArtifactS3Key",
          "#err": "errorMessage",
        },
        expressionAttributeValues: {
          ":s": "SUCCEEDED",
          ":c": completedAt,
          ":o": input.outputArtifactS3Key,
        },
      });
    } else {
      await updateItem({
        key,
        updateExpression: "SET #s = :s, #completedAt = :c REMOVE #err",
        expressionAttributeNames: {
          "#s": "status",
          "#completedAt": "completedAt",
          "#err": "errorMessage",
        },
        expressionAttributeValues: {
          ":s": "SUCCEEDED",
          ":c": completedAt,
        },
      });
    }
    return;
  }
  await updateItem({
    key,
    updateExpression: "SET #s = :s, #completedAt = :c, #err = :e",
    expressionAttributeNames: {
      "#s": "status",
      "#completedAt": "completedAt",
      "#err": "errorMessage",
    },
    expressionAttributeValues: {
      ":s": "FAILED",
      ":c": completedAt,
      ":e": input.errorMessage ?? "unknown error",
    },
  });
};

export const markJobExecutionRunning = async (
  jobId: string,
  sk: string,
): Promise<boolean> => {
  const current = await getJobExecutionBySk(jobId, sk);
  if (!current || current.status === "CANCELLED") {
    return false;
  }
  if (current.status === "RUNNING") {
    return true;
  }
  await updateItem({
    key: { PK: jobPk(jobId), SK: sk },
    updateExpression: "SET #s = :s",
    expressionAttributeNames: { "#s": "status" },
    expressionAttributeValues: { ":s": "RUNNING" },
  });
  return true;
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
      "SET #s = :s, #completedAt = :c, #err = :e REMOVE #out",
    expressionAttributeNames: {
      "#s": "status",
      "#completedAt": "completedAt",
      "#err": "errorMessage",
      "#out": "outputArtifactS3Key",
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
  triggeredBy?: string;
  /** 해당 단계 실행 시점의 입력 스냅샷(예: S3 object key). */
  inputSnapshotId?: string;
}): Promise<{
  finish: (
    status: "SUCCEEDED" | "FAILED",
    errorMessage?: string,
    outputArtifactS3Key?: string,
  ) => Promise<void>;
}> => {
  const executionId = randomUUID();
  const startedAt = new Date().toISOString();
  const SK = `EXEC#${startedAt}#${executionId}`;
  const row: JobExecutionRow = {
    PK: jobPk(input.jobId),
    SK,
    executionId,
    jobId: input.jobId,
    stageType: input.stageType,
    status: "RUNNING",
    triggeredBy: input.triggeredBy,
    startedAt,
    ...(input.inputSnapshotId
      ? { inputSnapshotId: input.inputSnapshotId }
      : {}),
  };
  await putItem(row as unknown as Record<string, unknown>);

  return {
    finish: async (status, errorMessage, outputArtifactS3Key) => {
      await finishJobExecution({
        jobId: input.jobId,
        sk: SK,
        status,
        errorMessage,
        outputArtifactS3Key:
          status === "SUCCEEDED" ? outputArtifactS3Key : undefined,
      });
    },
  };
};

export const startQueuedJobExecution = async (input: {
  jobId: string;
  stageType: JobExecutionStageType;
  triggeredBy?: string;
  inputSnapshotId?: string;
}): Promise<{
  executionId: string;
  sk: string;
  finish: (
    status: "SUCCEEDED" | "FAILED",
    errorMessage?: string,
    outputArtifactS3Key?: string,
  ) => Promise<void>;
}> => {
  const executionId = randomUUID();
  const startedAt = new Date().toISOString();
  const SK = `EXEC#${startedAt}#${executionId}`;
  const row: JobExecutionRow = {
    PK: jobPk(input.jobId),
    SK,
    executionId,
    jobId: input.jobId,
    stageType: input.stageType,
    status: "QUEUED",
    triggeredBy: input.triggeredBy,
    startedAt,
    ...(input.inputSnapshotId
      ? { inputSnapshotId: input.inputSnapshotId }
      : {}),
  };
  await putItem(row as unknown as Record<string, unknown>);

  return {
    executionId,
    sk: SK,
    finish: async (status, errorMessage, outputArtifactS3Key) => {
      await finishJobExecution({
        jobId: input.jobId,
        sk: SK,
        status,
        errorMessage,
        outputArtifactS3Key:
          status === "SUCCEEDED" ? outputArtifactS3Key : undefined,
      });
    },
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
