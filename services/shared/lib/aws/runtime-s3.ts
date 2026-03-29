import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  s3Client,
  type PutObjectCommandInput,
} from "./runtime-clients";
import { getAssetsBucketName } from "./runtime-env";

const isMissingS3ObjectError = (
  error: unknown,
): error is {
  name?: string;
  $metadata?: { httpStatusCode?: number };
} => {
  const maybe = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  const status = maybe.$metadata?.httpStatusCode;
  return (
    maybe.name === "NotFound" || maybe.name === "NoSuchKey" || status === 404
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

export const getBufferFromS3 = async (
  key: string,
): Promise<{ buffer: Buffer; contentType?: string } | null> => {
  const result = await s3Client.send(
    new GetObjectCommand({
      Bucket: getAssetsBucketName(),
      Key: key,
    }),
  );

  if (!result.Body) {
    return null;
  }

  const bytes = await result.Body.transformToByteArray();
  return {
    buffer: Buffer.from(bytes),
    contentType: result.ContentType,
  };
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
    if (isMissingS3ObjectError(error)) {
      return;
    }
    throw error;
  }
};

export type S3ListItem = {
  key: string;
  size?: number;
  lastModified?: string;
};

export const listObjectsFromS3 = async (
  prefix: string,
): Promise<S3ListItem[]> => {
  const result = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: getAssetsBucketName(),
      Prefix: prefix,
    }),
  );

  return (result.Contents ?? [])
    .filter((item) => typeof item?.Key === "string" && item.Key.length > 0)
    .map((item) => ({
      key: item.Key as string,
      ...(typeof item.Size === "number" ? { size: item.Size } : {}),
      ...(item.LastModified
        ? { lastModified: item.LastModified.toISOString() }
        : {}),
    }));
};

export const createSignedUploadUrlForS3 = async (input: {
  key: string;
  contentType: string;
  expiresInSec?: number;
}): Promise<string> => {
  return getSignedUrl(
    s3Client,
    new PutObjectCommand({
      Bucket: getAssetsBucketName(),
      Key: input.key,
      ContentType: input.contentType,
    }),
    {
      expiresIn: input.expiresInSec ?? 900,
    },
  );
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
    if (isMissingS3ObjectError(error)) {
      return {
        exists: false,
      };
    }
    throw error;
  }
};
