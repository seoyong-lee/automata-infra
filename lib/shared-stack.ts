import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { BaseStackProps } from './config';
import { createPreviewDistribution } from './modules/shared/cdn';
import { createObservabilityDashboard } from './modules/shared/observability';
import { createAssetsBucket } from './modules/shared/storage';

export type SharedStackProps = StackProps & BaseStackProps;

export class SharedStack extends Stack {
  public readonly assetsBucket: s3.Bucket;
  public readonly previewDistribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: SharedStackProps) {
    super(scope, id, {
      env: {
        region: props.region,
        account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
      },
      tags: {
        Project: props.projectPrefix,
        ManagedBy: 'CDK',
      },
    });

    this.assetsBucket = createAssetsBucket(this, props.projectPrefix);
    this.previewDistribution = createPreviewDistribution(this, this.assetsBucket);
    createObservabilityDashboard(this, props.projectPrefix);

    new CfnOutput(this, 'AssetsBucketName', {
      value: this.assetsBucket.bucketName,
    });

    new CfnOutput(this, 'PreviewDistributionDomain', {
      value: this.previewDistribution.distributionDomainName,
    });
  }
}
