export const region = process.env.AWS_REGION ?? "ap-northeast-2";

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
