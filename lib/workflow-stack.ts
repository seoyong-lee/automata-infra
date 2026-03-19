import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { BaseStackProps } from './config';
import { createJobsTable } from './modules/workflow/jobs-table';
import { createWorkflowQueues } from './modules/workflow/queues';
import { createWorkflowLambdas } from './modules/workflow/runtime-lambdas';

export type WorkflowStackProps = StackProps &
  BaseStackProps & {
    assetsBucket: s3.Bucket;
    previewDistribution: cloudfront.Distribution;
  };

export class WorkflowStack extends Stack {
  public readonly jobsTable: dynamodb.Table;
  public readonly reviewQueue: sqs.Queue;
  public readonly stateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: WorkflowStackProps) {
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

    this.jobsTable = createJobsTable(this, props.projectPrefix);

    const queues = createWorkflowQueues(this, props.projectPrefix);
    this.reviewQueue = queues.reviewQueue;

    const lambdas = createWorkflowLambdas(this, {
      projectPrefix: props.projectPrefix,
      envConfig: props.envConfig,
      assetsBucket: props.assetsBucket,
      jobsTable: this.jobsTable,
      reviewQueue: queues.reviewQueue,
    });

    const definition = new tasks.LambdaInvoke(this, 'PlanTopic', {
      lambdaFunction: lambdas.topicPlanner,
      payloadResponseOnly: true,
    })
      .next(
        new tasks.LambdaInvoke(this, 'BuildSceneJson', {
          lambdaFunction: lambdas.sceneJsonBuilder,
          payloadResponseOnly: true,
        }),
      )
      .next(
        new tasks.LambdaInvoke(this, 'GenerateSceneImages', {
          lambdaFunction: lambdas.imageGenerator,
          payloadResponseOnly: true,
        }),
      )
      .next(
        new tasks.LambdaInvoke(this, 'GenerateSceneVideo', {
          lambdaFunction: lambdas.videoGenerator,
          payloadResponseOnly: true,
        }),
      )
      .next(
        new tasks.LambdaInvoke(this, 'GenerateSceneTts', {
          lambdaFunction: lambdas.ttsGenerator,
          payloadResponseOnly: true,
        }),
      )
      .next(
        new tasks.LambdaInvoke(this, 'ValidateAssets', {
          lambdaFunction: lambdas.assetValidator,
          payloadResponseOnly: true,
        }),
      )
      .next(
        new tasks.LambdaInvoke(this, 'BuildRenderPlan', {
          lambdaFunction: lambdas.renderPlanBuilder,
          payloadResponseOnly: true,
        }),
      )
      .next(
        new tasks.LambdaInvoke(this, 'ComposeFinalVideo', {
          lambdaFunction: lambdas.finalComposition,
          payloadResponseOnly: true,
        }),
      )
      .next(
        new tasks.LambdaInvoke(this, 'RequestReview', {
          lambdaFunction: lambdas.reviewRequest,
          payloadResponseOnly: true,
        }),
      );

    this.stateMachine = new sfn.StateMachine(this, 'VideoFactoryStateMachine', {
      stateMachineName: `${props.projectPrefix}-workflow`,
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
    });

    new CfnOutput(this, 'JobsTableName', {
      value: this.jobsTable.tableName,
    });

    new CfnOutput(this, 'ReviewQueueUrl', {
      value: this.reviewQueue.queueUrl,
    });

    new CfnOutput(this, 'StateMachineArn', {
      value: this.stateMachine.stateMachineArn,
    });
  }
}
