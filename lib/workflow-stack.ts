import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { BaseStackProps } from "./config";
import { createJobsTable } from "./modules/workflow/jobs-table";
import { createWorkflowQueues } from "./modules/workflow/queues";
import { createWorkflowLambdas } from "./modules/workflow/runtime-lambdas";

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
        ManagedBy: "CDK",
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

    const planTopic = new tasks.LambdaInvoke(this, "PlanTopic", {
      lambdaFunction: lambdas.topicPlanner,
      payloadResponseOnly: true,
    });

    const buildSceneJson = new tasks.LambdaInvoke(this, "BuildSceneJson", {
      lambdaFunction: lambdas.sceneJsonBuilder,
      payloadResponseOnly: true,
    });

    const generateSceneImages = new tasks.LambdaInvoke(
      this,
      "GenerateSceneImages",
      {
        lambdaFunction: lambdas.imageGenerator,
        payloadResponseOnly: true,
      },
    );

    const generateSceneVideo = new tasks.LambdaInvoke(
      this,
      "GenerateSceneVideo",
      {
        lambdaFunction: lambdas.videoGenerator,
        payloadResponseOnly: true,
      },
    );

    const generateSceneTts = new tasks.LambdaInvoke(this, "GenerateSceneTts", {
      lambdaFunction: lambdas.ttsGenerator,
      payloadResponseOnly: true,
    });

    const validateAssets = new tasks.LambdaInvoke(this, "ValidateAssets", {
      lambdaFunction: lambdas.assetValidator,
      payloadResponseOnly: true,
    });

    const buildRenderPlan = new tasks.LambdaInvoke(this, "BuildRenderPlan", {
      lambdaFunction: lambdas.renderPlanBuilder,
      payloadResponseOnly: true,
    });

    const composeFinalVideo = new tasks.LambdaInvoke(
      this,
      "ComposeFinalVideo",
      {
        lambdaFunction: lambdas.finalComposition,
        payloadResponseOnly: true,
      },
    );

    const requestReview = new tasks.LambdaInvoke(this, "RequestReview", {
      lambdaFunction: lambdas.reviewRequest,
      integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
      payload: sfn.TaskInput.fromObject({
        taskToken: sfn.JsonPath.taskToken,
        input: sfn.JsonPath.entirePayload,
      }),
      resultPath: "$.reviewDecision",
    });

    const uploadYoutube = new tasks.LambdaInvoke(this, "UploadYoutube", {
      lambdaFunction: lambdas.uploadWorker,
      payloadResponseOnly: true,
    });

    const reviewDecision = new sfn.Choice(this, "ReviewDecision");
    const regenerationScope = new sfn.Choice(this, "RegenerationScope");
    const rejected = new sfn.Succeed(this, "Rejected");

    const definition = planTopic
      .next(buildSceneJson)
      .next(generateSceneImages)
      .next(generateSceneVideo)
      .next(generateSceneTts)
      .next(validateAssets)
      .next(buildRenderPlan)
      .next(composeFinalVideo)
      .next(requestReview)
      .next(
        reviewDecision
          .when(
            sfn.Condition.stringEquals("$.reviewDecision.action", "approve"),
            uploadYoutube,
          )
          .when(
            sfn.Condition.stringEquals("$.reviewDecision.action", "regenerate"),
            regenerationScope
              .when(
                sfn.Condition.stringEquals(
                  "$.reviewDecision.regenerationScope",
                  "image",
                ),
                generateSceneImages,
              )
              .when(
                sfn.Condition.stringEquals(
                  "$.reviewDecision.regenerationScope",
                  "video",
                ),
                generateSceneVideo,
              )
              .when(
                sfn.Condition.stringEquals(
                  "$.reviewDecision.regenerationScope",
                  "voice",
                ),
                generateSceneTts,
              )
              .when(
                sfn.Condition.stringEquals(
                  "$.reviewDecision.regenerationScope",
                  "metadata",
                ),
                buildSceneJson,
              )
              .otherwise(composeFinalVideo),
          )
          .otherwise(rejected),
      );

    this.stateMachine = new sfn.StateMachine(this, "VideoFactoryStateMachine", {
      stateMachineName: `${props.projectPrefix}-workflow`,
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
    });

    new CfnOutput(this, "JobsTableName", {
      value: this.jobsTable.tableName,
    });

    new CfnOutput(this, "ReviewQueueUrl", {
      value: this.reviewQueue.queueUrl,
    });

    new CfnOutput(this, "StateMachineArn", {
      value: this.stateMachine.stateMachineArn,
    });
  }
}
