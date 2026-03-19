import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import {
  SendTaskSuccessCommand,
  SendTaskFailureCommand,
  SFNClient,
} from '@aws-sdk/client-sfn';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const region = process.env.AWS_REGION ?? 'ap-northeast-2';

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

export const getJobsTableName = (): string => getRequiredEnv('JOBS_TABLE_NAME');

export const getAssetsBucketName = (): string => getRequiredEnv('ASSETS_BUCKET_NAME');

export const getReviewQueueUrl = (): string => getRequiredEnv('REVIEW_QUEUE_URL');

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
  await ddbClient.send(
    new PutCommand({
      TableName: getJobsTableName(),
      Item: item,
    }),
  );
};

export const getItem = async <T>(key: Record<string, unknown>): Promise<T | null> => {
  const result = await ddbClient.send(
    new GetCommand({
      TableName: getJobsTableName(),
      Key: key,
    }),
  );

  return (result.Item as T | undefined) ?? null;
};

export const queryItems = async <T>(input: {
  keyConditionExpression: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues: Record<string, unknown>;
  scanIndexForward?: boolean;
  limit?: number;
}): Promise<T[]> => {
  const result = await ddbClient.send(
    new QueryCommand({
      TableName: getJobsTableName(),
      KeyConditionExpression: input.keyConditionExpression,
      ExpressionAttributeNames: input.expressionAttributeNames,
      ExpressionAttributeValues: input.expressionAttributeValues,
      ScanIndexForward: input.scanIndexForward,
      Limit: input.limit,
    }),
  );

  return (result.Items as T[] | undefined) ?? [];
};

export const updateItem = async (input: {
  key: Record<string, unknown>;
  updateExpression: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues: Record<string, unknown>;
  conditionExpression?: string;
}): Promise<void> => {
  await ddbClient.send(
    new UpdateCommand({
      TableName: getJobsTableName(),
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
      ContentType: 'application/json',
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

export const sendReviewMessage = async (messageBody: Record<string, unknown>): Promise<void> => {
  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: getReviewQueueUrl(),
      MessageBody: JSON.stringify(messageBody),
    }),
  );
};

export const sendTaskSuccess = async (taskToken: string, output: unknown): Promise<void> => {
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
