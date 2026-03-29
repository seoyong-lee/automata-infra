import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import {
  SendTaskFailureCommand,
  SendTaskSuccessCommand,
  SFNClient,
} from "@aws-sdk/client-sfn";
import {
  BatchGetCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { region } from "./runtime-env";

export {
  BatchGetCommand,
  DeleteCommand,
  DeleteObjectCommand,
  GetCommand,
  GetObjectCommand,
  GetSecretValueCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutCommand,
  PutObjectCommand,
  QueryCommand,
  SendMessageCommand,
  SendTaskFailureCommand,
  SendTaskSuccessCommand,
  UpdateCommand,
  type PutObjectCommandInput,
};

export const ddbClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region }),
);
export const s3Client = new S3Client({ region });
export const secretsClient = new SecretsManagerClient({ region });
export const sfnClient = new SFNClient({ region });
export const sqsClient = new SQSClient({ region });
