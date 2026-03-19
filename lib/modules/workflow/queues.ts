import { Duration } from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export type WorkflowQueues = {
  assetQueue: sqs.Queue;
  providerPollQueue: sqs.Queue;
  compositionQueue: sqs.Queue;
  uploadQueue: sqs.Queue;
  reviewQueue: sqs.Queue;
  deadLetterQueue: sqs.Queue;
};

export const createWorkflowQueues = (
  scope: Construct,
  projectPrefix: string,
): WorkflowQueues => {
  const deadLetterQueue = new sqs.Queue(scope, 'DeadLetterQueue', {
    queueName: `${projectPrefix}-dlq`,
    retentionPeriod: Duration.days(14),
  });

  const createQueue = (id: string, suffix: string): sqs.Queue =>
    new sqs.Queue(scope, id, {
      queueName: `${projectPrefix}-${suffix}`,
      visibilityTimeout: Duration.seconds(120),
      deadLetterQueue: {
        queue: deadLetterQueue,
        maxReceiveCount: 3,
      },
    });

  return {
    assetQueue: createQueue('AssetQueue', 'asset-queue'),
    providerPollQueue: createQueue('ProviderPollQueue', 'provider-poll-queue'),
    compositionQueue: createQueue('CompositionQueue', 'composition-queue'),
    uploadQueue: createQueue('UploadQueue', 'upload-queue'),
    reviewQueue: createQueue('ReviewQueue', 'review-queue'),
    deadLetterQueue,
  };
};
