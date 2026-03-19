import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export const createPreviewDistribution = (
  scope: Construct,
  assetsBucket: s3.Bucket,
): cloudfront.Distribution => {
  return new cloudfront.Distribution(scope, 'PreviewDistribution', {
    defaultBehavior: {
      origin: origins.S3BucketOrigin.withOriginAccessControl(assetsBucket),
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
    },
    defaultRootObject: '',
  });
};
