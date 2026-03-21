import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import {
  SendTaskSuccessCommand,
  SendTaskFailureCommand,
  SFNClient,
} from "@aws-sdk/client-sfn";
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const region = process.env.AWS_REGION ?? "ap-northeast-2";

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
const s3Client = new S3Client({ region });
const secretsClient = new SecretsManagerClient({ region });
const sfnClient = new SFNClient({ region });
const sqsClient = new SQSClient({ region });

export const getRequiredEnv = (name: string): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }

  return value;
};

export const getOptionalEnv = (name: string): string | undefined => {
  return process.env[name];
};

export const getJobsTableName = (): string => getRequiredEnv("JOBS_TABLE_NAME");

export const getConfigTableName = (): string =>
  getRequiredEnv("CONFIG_TABLE_NAME");

export const getAssetsBucketName = (): string =>
  getRequiredEnv("ASSETS_BUCKET_NAME");

export const getReviewQueueUrl = (): string =>
  getRequiredEnv("REVIEW_QUEUE_URL");

export const getSecretJson = async <T>(secretId: string): Promise<T | null> => {
  const secretValue = await secretsClient.send(
    new GetSecretValueCommand({
      SecretId: secretId,
    }),
  );

  if (!secretValue.SecretString) {
    return null;
  }

  return JSON.parse(secretValue.SecretString) as T;
};

export const putItem = async (item: Record<string, unknown>): Promise<void> => {
  await putItemToTable(getJobsTableName(), item);
};

export const putItemToTable = async (
  tableName: string,
  item: Record<string, unknown>,
): Promise<void> => {
  await ddbClient.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
    }),
  );
};

export const deleteItemFromTable = async (
  tableName: string,
  key: Record<string, unknown>,
): Promise<void> => {
  await ddbClient.send(
    new DeleteCommand({
      TableName: tableName,
      Key: key,
    }),
  );
};

export const getItem = async <T>(
  key: Record<string, unknown>,
): Promise<T | null> => {
  return getItemFromTable<T>(getJobsTableName(), key);
};

export const getItemFromTable = async <T>(
  tableName: string,
  key: Record<string, unknown>,
): Promise<T | null> => {
  const result = await ddbClient.send(
    new GetCommand({
      TableName: tableName,
      Key: key,
    }),
  );

  return (result.Item as T | undefined) ?? null;
};

export const queryItems = async <T>(input: {
  indexName?: string;
  keyConditionExpression: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues: Record<string, unknown>;
  scanIndexForward?: boolean;
  limit?: number;
}): Promise<T[]> => {
  return queryItemsFromTable<T>(getJobsTableName(), input);
};

export const queryItemsFromTable = async <T>(
  tableName: string,
  input: {
    indexName?: string;
    keyConditionExpression: string;
    expressionAttributeNames?: Record<string, string>;
    expressionAttributeValues: Record<string, unknown>;
    scanIndexForward?: boolean;
    limit?: number;
  },
): Promise<T[]> => {
  const result = await ddbClient.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: input.indexName,
      KeyConditionExpression: input.keyConditionExpression,
      ExpressionAttributeNames: input.expressionAttributeNames,
      ExpressionAttributeValues: input.expressionAttributeValues,
      ScanIndexForward: input.scanIndexForward,
      Limit: input.limit,
    }),
  );

  return (result.Items as T[] | undefined) ?? [];
};

export const queryItemsPage = async <T>(input: {
  indexName?: string;
  keyConditionExpression: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues: Record<string, unknown>;
  scanIndexForward?: boolean;
  limit?: number;
  exclusiveStartKey?: Record<string, unknown>;
}): Promise<{
  items: T[];
  lastEvaluatedKey?: Record<string, unknown>;
}> => {
  const result = await ddbClient.send(
    new QueryCommand({
      TableName: getJobsTableName(),
      IndexName: input.indexName,
      KeyConditionExpression: input.keyConditionExpression,
      ExpressionAttributeNames: input.expressionAttributeNames,
      ExpressionAttributeValues: input.expressionAttributeValues,
      ScanIndexForward: input.scanIndexForward,
      Limit: input.limit,
      ExclusiveStartKey: input.exclusiveStartKey,
    }),
  );

  return {
    items: (result.Items as T[] | undefined) ?? [],
    lastEvaluatedKey: result.LastEvaluatedKey as
      | Record<string, unknown>
      | undefined,
  };
};

export const updateItem = async (input: {
  key: Record<string, unknown>;
  updateExpression: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues: Record<string, unknown>;
  conditionExpression?: string;
}): Promise<void> => {
  await updateItemInTable(getJobsTableName(), input);
};

export const updateItemInTable = async (
  tableName: string,
  input: {
    key: Record<string, unknown>;
    updateExpression: string;
    expressionAttributeNames?: Record<string, string>;
    expressionAttributeValues: Record<string, unknown>;
    conditionExpression?: string;
  },
): Promise<void> => {
  await ddbClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: input.key,
      UpdateExpression: input.updateExpression,
      ExpressionAttributeNames: input.expressionAttributeNames,
      ExpressionAttributeValues: input.expressionAttributeValues,
      ConditionExpression: input.conditionExpression,
    }),
  );
};

export const putJsonToS3 = async (
  key: string,
  body: unknown,
  extra?: Partial<PutObjectCommandInput>,
): Promise<string> => {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: getAssetsBucketName(),
      Key: key,
      Body: JSON.stringify(body, null, 2),
      ContentType: "application/json",
      ...extra,
    }),
  );

  return key;
};

export const putBufferToS3 = async (
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string,
): Promise<string> => {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: getAssetsBucketName(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  return key;
};

export const getJsonFromS3 = async <T>(key: string): Promise<T | null> => {
  const result = await s3Client.send(
    new GetObjectCommand({
      Bucket: getAssetsBucketName(),
      Key: key,
    }),
  );

  if (!result.Body) {
    return null;
  }

  const body = await result.Body.transformToString();
  return JSON.parse(body) as T;
};

export const deleteObjectFromS3 = async (key: string): Promise<void> => {
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: getAssetsBucketName(),
        Key: key,
      }),
    );
  } catch (error) {
    const maybe = error as {
      name?: string;
      $metadata?: { httpStatusCode?: number };
    };
    const status = maybe.$metadata?.httpStatusCode;
    if (
      maybe.name === "NotFound" ||
      maybe.name === "NoSuchKey" ||
      status === 404
    ) {
      return;
    }
    throw error;
  }
};

export const headObjectFromS3 = async (
  key: string,
): Promise<{
  exists: boolean;
  contentType?: string;
  contentLength?: number;
}> => {
  try {
    const result = await s3Client.send(
      new HeadObjectCommand({
        Bucket: getAssetsBucketName(),
        Key: key,
      }),
    );

    return {
      exists: true,
      contentType: result.ContentType,
      contentLength: result.ContentLength,
    };
  } catch (error) {
    const maybe = error as {
      name?: string;
      $metadata?: { httpStatusCode?: number };
    };
    const status = maybe.$metadata?.httpStatusCode;
    if (
      maybe.name === "NotFound" ||
      maybe.name === "NoSuchKey" ||
      status === 404
    ) {
      return {
        exists: false,
      };
    }
    throw error;
  }
};

export const sendReviewMessage = async (
  messageBody: Record<string, unknown>,
): Promise<void> => {
  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: getReviewQueueUrl(),
      MessageBody: JSON.stringify(messageBody),
    }),
  );
};

export const sendTaskSuccess = async (
  taskToken: string,
  output: unknown,
): Promise<void> => {
  await sfnClient.send(
    new SendTaskSuccessCommand({
      taskToken,
      output: JSON.stringify(output),
    }),
  );
};

export const sendTaskFailure = async (
  taskToken: string,
  error: string,
  cause: string,
): Promise<void> => {
  await sfnClient.send(
    new SendTaskFailureCommand({
      taskToken,
      error,
      cause,
    }),
  );
};
