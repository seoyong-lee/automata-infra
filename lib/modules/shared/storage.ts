import { RemovalPolicy } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export const createAssetsBucket = (
  scope: Construct,
  projectPrefix: string,
): s3.Bucket => {
  return new s3.Bucket(scope, 'AssetsBucket', {
    bucketName: `${projectPrefix}-assets`.toLowerCase(),
    versioned: true,
    encryption: s3.BucketEncryption.S3_MANAGED,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    enforceSSL: true,
    autoDeleteObjects: false,
    removalPolicy: RemovalPolicy.RETAIN,
  });
};
