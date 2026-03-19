import { getItem, putItem, queryItems, updateItem } from "../aws/runtime";

export type JobMetaItem = {
  PK: string;
  SK: "META";
  jobId: string;
  channelId: string;
  topicId: string;
  topicHash: string;
  status: string;
  language: string;
  targetDurationSec: number;
  videoTitle: string;
  estimatedCost: number;
  providerCosts: Record<string, number>;
  reviewMode: boolean;
  retryCount: number;
  lastError: string | null;
  sceneJsonS3Key?: string;
  renderPlanS3Key?: string;
  finalVideoS3Key?: string;
  thumbnailS3Key?: string;
  previewS3Key?: string;
  reviewTaskToken?: string;
  reviewRequestedAt?: string;
  reviewAction?: string;
  reviewPreviewS3Key?: string;
  uploadStatus?: string;
  uploadVideoId?: string;
  createdAt: string;
  updatedAt: string;
  GSI1PK: string;
  GSI1SK: string;
  GSI2PK: string;
  GSI2SK: string;
  GSI3PK: string;
  GSI3SK: string;
};

const jobPk = (jobId: string): string => `JOB#${jobId}`;

export const putJobMeta = async (item: JobMetaItem): Promise<void> => {
  await putItem(item);
};

export const getJobMeta = async (
  jobId: string,
): Promise<JobMetaItem | null> => {
  return getItem<JobMetaItem>({
    PK: jobPk(jobId),
    SK: "META",
  });
};

export const updateJobMeta = async (
  jobId: string,
  fields: Record<string, unknown>,
  status?: string,
): Promise<void> => {
  const updatedAt = new Date().toISOString();
  const names: Record<string, string> = {
    "#updatedAt": "updatedAt",
  };
  const values: Record<string, unknown> = {
    ":updatedAt": updatedAt,
  };
  const assignments = ["#updatedAt = :updatedAt"];

  if (status) {
    names["#status"] = "status";
    names["#gsi1pk"] = "GSI1PK";
    names["#gsi1sk"] = "GSI1SK";
    values[":status"] = status;
    values[":gsi1pk"] = `STATUS#${status}`;
    values[":gsi1sk"] = updatedAt;
    assignments.push(
      "#status = :status",
      "#gsi1pk = :gsi1pk",
      "#gsi1sk = :gsi1sk",
    );
  }

  for (const [key, value] of Object.entries(fields)) {
    names[`#${key}`] = key;
    values[`:${key}`] = value;
    assignments.push(`#${key} = :${key}`);
  }

  await updateItem({
    key: {
      PK: jobPk(jobId),
      SK: "META",
    },
    updateExpression: `SET ${assignments.join(", ")}`,
    expressionAttributeNames: names,
    expressionAttributeValues: values,
  });
};

export const putSceneAsset = async (
  jobId: string,
  sceneId: number,
  item: Record<string, unknown>,
): Promise<void> => {
  await putItem({
    PK: jobPk(jobId),
    SK: `SCENE#${sceneId}`,
    sceneId,
    ...item,
  });
};

export const putRenderArtifact = async (
  jobId: string,
  item: Record<string, unknown>,
): Promise<void> => {
  await putItem({
    PK: jobPk(jobId),
    SK: "ARTIFACT#FINAL",
    ...item,
  });
};

export const putUploadRecord = async (
  jobId: string,
  item: Record<string, unknown>,
): Promise<void> => {
  await putItem({
    PK: jobPk(jobId),
    SK: "UPLOAD#YOUTUBE",
    ...item,
  });
};

export const putReviewRecord = async (
  jobId: string,
  item: Record<string, unknown>,
): Promise<void> => {
  await putItem({
    PK: jobPk(jobId),
    SK: `REVIEW#${new Date().toISOString()}`,
    ...item,
  });
};

export const listJobItems = async (
  jobId: string,
): Promise<Record<string, unknown>[]> => {
  return queryItems<Record<string, unknown>>({
    keyConditionExpression: "PK = :pk",
    expressionAttributeValues: {
      ":pk": jobPk(jobId),
    },
    scanIndexForward: true,
    limit: 100,
  });
};

export const listJobMetasByStatus = async (input: {
  status: string;
  limit?: number;
}): Promise<JobMetaItem[]> => {
  return queryItems<JobMetaItem>({
    indexName: "GSI1",
    keyConditionExpression: "GSI1PK = :statusPk",
    expressionAttributeValues: {
      ":statusPk": `STATUS#${input.status}`,
    },
    scanIndexForward: false,
    limit: input.limit ?? 20,
  });
};

export const listJobMetasByChannel = async (input: {
  channelId: string;
  limit?: number;
}): Promise<JobMetaItem[]> => {
  return queryItems<JobMetaItem>({
    indexName: "GSI2",
    keyConditionExpression: "GSI2PK = :channelPk",
    expressionAttributeValues: {
      ":channelPk": `CHANNEL#${input.channelId}`,
    },
    scanIndexForward: false,
    limit: input.limit ?? 20,
  });
};
