import { CfnOutput, Duration, Stack, StackProps } from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { BaseStackProps } from "./config";
import { createJobsTable } from "./modules/workflow/jobs-table";
import { createWorkflowQueues } from "./modules/workflow/queues";
import { createWorkflowRenderInfrastructure } from "./modules/workflow/render-infra";
import { createWorkflowLambdas } from "./modules/workflow/runtime-lambdas";

export type WorkflowStackProps = StackProps &
  BaseStackProps & {
    assetsBucket: s3.Bucket;
    llmConfigTable: dynamodb.Table;
    previewDistribution: cloudfront.Distribution;
  };

export class WorkflowStack extends Stack {
  public readonly jobsTable: dynamodb.Table;
  public readonly reviewQueue: sqs.Queue;
  public readonly stateMachine: sfn.StateMachine;
  public readonly renderClusterArn: string;
  public readonly renderTaskDefinitionArn: string;
  public readonly renderSecurityGroupId: string;
  public readonly renderSubnetIds: string[];
  public readonly renderContainerName: string;

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
    const renderInfra = createWorkflowRenderInfrastructure(this, {
      projectPrefix: props.projectPrefix,
      assetsBucket: props.assetsBucket,
    });
    this.renderClusterArn = renderInfra.cluster.clusterArn;
    this.renderTaskDefinitionArn = renderInfra.taskDefinition.taskDefinitionArn;
    this.renderSecurityGroupId = renderInfra.securityGroup.securityGroupId;
    this.renderSubnetIds = renderInfra.vpc.publicSubnets.map((subnet) => subnet.subnetId);
    this.renderContainerName = renderInfra.containerName;

    const lambdas = createWorkflowLambdas(this, {
      projectPrefix: props.projectPrefix,
      envConfig: props.envConfig,
      assetsBucket: props.assetsBucket,
      jobsTable: this.jobsTable,
      llmConfigTable: props.llmConfigTable,
      reviewQueue: queues.reviewQueue,
      previewDistribution: props.previewDistribution,
      renderInfra,
    });

    const planTopic = new tasks.LambdaInvoke(this, "PlanTopic", {
      lambdaFunction: lambdas.topicPlanner,
      payloadResponseOnly: true,
    });

    const buildSceneJson = new tasks.LambdaInvoke(this, "BuildSceneJson", {
      lambdaFunction: lambdas.sceneJsonBuilder,
      payloadResponseOnly: true,
    });

    /** metadata 재생성 시 씬 JSON만 다시 빌드한 뒤 Map으로 합류하기 위한 별도 상태(동일 Lambda). */
    const buildSceneJsonAfterRegen = new tasks.LambdaInvoke(
      this,
      "BuildSceneJsonAfterRegen",
      {
        lambdaFunction: lambdas.sceneJsonBuilder,
        payloadResponseOnly: true,
      },
    );

    const generateSceneImages = new tasks.LambdaInvoke(
      this,
      "GenerateSceneImages",
      {
        lambdaFunction: lambdas.imageGenerator,
        payloadResponseOnly: true,
      },
    );
    generateSceneImages.addRetry({
      errors: ["States.TaskFailed"],
      interval: Duration.seconds(3),
      backoffRate: 2,
      maxAttempts: 3,
    });
    const generateSceneImageForMap = new tasks.LambdaInvoke(
      this,
      "GenerateSceneImageForMap",
      {
        lambdaFunction: lambdas.imageGenerator,
        payloadResponseOnly: true,
      },
    );
    generateSceneImageForMap.addRetry({
      errors: ["States.TaskFailed"],
      interval: Duration.seconds(3),
      backoffRate: 2,
      maxAttempts: 3,
    });

    const generateSceneVideo = new tasks.LambdaInvoke(
      this,
      "GenerateSceneVideo",
      {
        lambdaFunction: lambdas.videoGenerator,
        payloadResponseOnly: true,
      },
    );
    generateSceneVideo.addRetry({
      errors: ["States.TaskFailed"],
      interval: Duration.seconds(3),
      backoffRate: 2,
      maxAttempts: 3,
    });
    const generateSceneVideoForMap = new tasks.LambdaInvoke(
      this,
      "GenerateSceneVideoForMap",
      {
        lambdaFunction: lambdas.videoGenerator,
        payloadResponseOnly: true,
      },
    );
    generateSceneVideoForMap.addRetry({
      errors: ["States.TaskFailed"],
      interval: Duration.seconds(3),
      backoffRate: 2,
      maxAttempts: 3,
    });

    const generateSceneTts = new tasks.LambdaInvoke(this, "GenerateSceneTts", {
      lambdaFunction: lambdas.ttsGenerator,
      payloadResponseOnly: true,
    });
    generateSceneTts.addRetry({
      errors: ["States.TaskFailed"],
      interval: Duration.seconds(3),
      backoffRate: 2,
      maxAttempts: 3,
    });
    const generateSceneTtsForMap = new tasks.LambdaInvoke(
      this,
      "GenerateSceneTtsForMap",
      {
        lambdaFunction: lambdas.ttsGenerator,
        payloadResponseOnly: true,
      },
    );
    generateSceneTtsForMap.addRetry({
      errors: ["States.TaskFailed"],
      interval: Duration.seconds(3),
      backoffRate: 2,
      maxAttempts: 3,
    });

    /** 두 번째 Map 전용(동일 Lambda, 별도 Step 상태 — CDK는 Map processor마다 상태 그래프를 분리해야 함). */
    const generateSceneImageForMapAfterRegen = new tasks.LambdaInvoke(
      this,
      "GenerateSceneImageForMapAfterRegen",
      {
        lambdaFunction: lambdas.imageGenerator,
        payloadResponseOnly: true,
      },
    );
    generateSceneImageForMapAfterRegen.addRetry({
      errors: ["States.TaskFailed"],
      interval: Duration.seconds(3),
      backoffRate: 2,
      maxAttempts: 3,
    });
    const generateSceneVideoForMapAfterRegen = new tasks.LambdaInvoke(
      this,
      "GenerateSceneVideoForMapAfterRegen",
      {
        lambdaFunction: lambdas.videoGenerator,
        payloadResponseOnly: true,
      },
    );
    generateSceneVideoForMapAfterRegen.addRetry({
      errors: ["States.TaskFailed"],
      interval: Duration.seconds(3),
      backoffRate: 2,
      maxAttempts: 3,
    });
    const generateSceneTtsForMapAfterRegen = new tasks.LambdaInvoke(
      this,
      "GenerateSceneTtsForMapAfterRegen",
      {
        lambdaFunction: lambdas.ttsGenerator,
        payloadResponseOnly: true,
      },
    );
    generateSceneTtsForMapAfterRegen.addRetry({
      errors: ["States.TaskFailed"],
      interval: Duration.seconds(3),
      backoffRate: 2,
      maxAttempts: 3,
    });

    const generateSceneAssetsMap = new sfn.Map(this, "GenerateSceneAssets", {
      itemsPath: sfn.JsonPath.stringAt("$.sceneJson.scenes"),
      itemSelector: {
        "jobId.$": "$.jobId",
        "sceneId.$": "$$.Map.Item.Value.sceneId",
        "imagePrompt.$": "$$.Map.Item.Value.imagePrompt",
        "videoPrompt.$": "$$.Map.Item.Value.videoPrompt",
        "narration.$": "$$.Map.Item.Value.narration",
        "durationSec.$": "$$.Map.Item.Value.durationSec",
      },
      resultPath: sfn.JsonPath.DISCARD,
      maxConcurrency: 10,
    });
    generateSceneAssetsMap.itemProcessor(
      sfn.Chain.start(generateSceneImageForMap)
        .next(generateSceneVideoForMap)
        .next(generateSceneTtsForMap),
    );

    /** metadata 재생성 시 씬 JSON이 바뀌면 동일 Map을 다시 돌려야 하나, Map은 next를 하나만 가질 수 있어 복제한다. */
    const generateSceneAssetsMapAfterRegen = new sfn.Map(
      this,
      "GenerateSceneAssetsAfterMetadataRegen",
      {
        itemsPath: sfn.JsonPath.stringAt("$.sceneJson.scenes"),
        itemSelector: {
          "jobId.$": "$.jobId",
          "sceneId.$": "$$.Map.Item.Value.sceneId",
          "imagePrompt.$": "$$.Map.Item.Value.imagePrompt",
          "videoPrompt.$": "$$.Map.Item.Value.videoPrompt",
          "narration.$": "$$.Map.Item.Value.narration",
          "durationSec.$": "$$.Map.Item.Value.durationSec",
        },
        resultPath: sfn.JsonPath.DISCARD,
        maxConcurrency: 10,
      },
    );
    generateSceneAssetsMapAfterRegen.itemProcessor(
      sfn.Chain.start(generateSceneImageForMapAfterRegen)
        .next(generateSceneVideoForMapAfterRegen)
        .next(generateSceneTtsForMapAfterRegen),
    );

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
    composeFinalVideo.addRetry({
      errors: ["States.TaskFailed"],
      interval: Duration.seconds(5),
      backoffRate: 2,
      maxAttempts: 2,
    });

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
    const collectMetrics = new tasks.LambdaInvoke(this, "CollectMetrics", {
      lambdaFunction: lambdas.metricsCollector,
      payloadResponseOnly: true,
    });
    const workflowComplete = new sfn.Succeed(this, "WorkflowComplete");

    const autoPublishEnabled = new sfn.Choice(this, "AutoPublishEnabled");
    const reviewDecision = new sfn.Choice(this, "ReviewDecision");
    const regenerationScope = new sfn.Choice(this, "RegenerationScope");
    const rejected = new sfn.Succeed(this, "Rejected");
    const uploadAndCollectMetrics = sfn.Chain.start(uploadYoutube)
      .next(collectMetrics)
      .next(workflowComplete);

    const reviewFlow = requestReview.next(
      reviewDecision
        .when(
          sfn.Condition.stringEquals("$.reviewDecision.action", "approve"),
          uploadAndCollectMetrics,
        )
        .when(
          sfn.Condition.stringEquals("$.reviewDecision.action", "regenerate"),
          regenerationScope
            .when(
              sfn.Condition.stringEquals(
                "$.reviewDecision.regenerationScope",
                "image",
              ),
              generateSceneImages.next(validateAssets),
            )
            .when(
              sfn.Condition.stringEquals(
                "$.reviewDecision.regenerationScope",
                "video",
              ),
              generateSceneVideo.next(validateAssets),
            )
            .when(
              sfn.Condition.stringEquals(
                "$.reviewDecision.regenerationScope",
                "voice",
              ),
              generateSceneTts.next(validateAssets),
            )
            .when(
              sfn.Condition.stringEquals(
                "$.reviewDecision.regenerationScope",
                "metadata",
              ),
              buildSceneJsonAfterRegen
                .next(generateSceneAssetsMapAfterRegen)
                .next(validateAssets),
            )
            .otherwise(rejected),
        )
        .otherwise(rejected),
    );

    /**
     * 재생성(이미지/영상/음성/메타데이터) 이후에는 항상
     * validate → render plan → compose → (autoPublish 또는 다시 review)로 합류한다.
     * (이전에는 일부 분기가 compose로만 가서 검증·플랜 재계산이 생략됨.)
     */
    const rejoinAfterAssetChanges = validateAssets
      .next(buildRenderPlan)
      .next(composeFinalVideo)
      .next(
        autoPublishEnabled
          .when(
            sfn.Condition.booleanEquals("$.autoPublish", true),
            uploadAndCollectMetrics,
          )
          .otherwise(reviewFlow),
      );

    const definition = planTopic
      .next(buildSceneJson)
      .next(generateSceneAssetsMap)
      .next(rejoinAfterAssetChanges);

    this.stateMachine = new sfn.StateMachine(this, "VideoFactoryStateMachine", {
      stateMachineName: `${props.projectPrefix}-workflow`,
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
    });

    if (
      props.envConfig.workflowScheduleEnabled &&
      props.envConfig.workflowScheduleExpression
    ) {
      new events.Rule(this, "WorkflowSchedule", {
        schedule: events.Schedule.expression(
          props.envConfig.workflowScheduleExpression,
        ),
        targets: [
          new targets.SfnStateMachine(this.stateMachine, {
            input: events.RuleTargetInput.fromObject({
              trigger: "schedule",
              source: "eventbridge-rule",
            }),
          }),
        ],
      });
    }

    new CfnOutput(this, "JobsTableName", {
      value: this.jobsTable.tableName,
    });

    new CfnOutput(this, "ReviewQueueUrl", {
      value: this.reviewQueue.queueUrl,
    });

    new CfnOutput(this, "StateMachineArn", {
      value: this.stateMachine.stateMachineArn,
    });
    new CfnOutput(this, "RenderClusterArn", {
      value: this.renderClusterArn,
    });
  }
}
