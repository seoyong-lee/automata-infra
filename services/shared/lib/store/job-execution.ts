import { randomUUID } from "node:crypto";

import { putItem, queryItems, updateItem } from "../aws/runtime";

const jobPk = (jobId: string): string => `JOB#${jobId}`;

export type JobExecutionStageType =
  | "TOPIC_PLAN"
  | "SCENE_JSON"
  | "ASSET_GENERATION";

export type JobExecutionStatus =
  | "QUEUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED";

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
};

export const finishJobExecution = async (input: {
  jobId: string;
  sk: string;
  status: "SUCCEEDED" | "FAILED";
  errorMessage?: string;
}): Promise<void> => {
  const completedAt = new Date().toISOString();
  const key = { PK: jobPk(input.jobId), SK: input.sk };
  if (input.status === "SUCCEEDED") {
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
): Promise<void> => {
  await updateItem({
    key: { PK: jobPk(jobId), SK: sk },
    updateExpression: "SET #s = :s",
    expressionAttributeNames: { "#s": "status" },
    expressionAttributeValues: { ":s": "RUNNING" },
  });
};

export const startJobExecution = async (input: {
  jobId: string;
  stageType: JobExecutionStageType;
  triggeredBy?: string;
}): Promise<{
  finish: (
    status: "SUCCEEDED" | "FAILED",
    errorMessage?: string,
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
  };
  await putItem(row as unknown as Record<string, unknown>);

  return {
    finish: async (status, errorMessage) => {
      await finishJobExecution({
        jobId: input.jobId,
        sk: SK,
        status,
        errorMessage,
      });
    },
  };
};

export const startQueuedJobExecution = async (input: {
  jobId: string;
  stageType: JobExecutionStageType;
  triggeredBy?: string;
}): Promise<{
  executionId: string;
  sk: string;
  finish: (
    status: "SUCCEEDED" | "FAILED",
    errorMessage?: string,
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
  };
  await putItem(row as unknown as Record<string, unknown>);

  return {
    executionId,
    sk: SK,
    finish: async (status, errorMessage) => {
      await finishJobExecution({
        jobId: input.jobId,
        sk: SK,
        status,
        errorMessage,
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
    limit: 100,
  });
  return items;
};
