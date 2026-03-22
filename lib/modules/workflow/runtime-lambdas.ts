import * as path from "path";
import { Duration } from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { VideoFactoryEnvConfig } from "../../config";

export type WorkflowLambdas = {
  topicPlanner: nodejs.NodejsFunction;
  sceneJsonBuilder: nodejs.NodejsFunction;
  imageGenerator: nodejs.NodejsFunction;
  videoGenerator: nodejs.NodejsFunction;
  ttsGenerator: nodejs.NodejsFunction;
  assetValidator: nodejs.NodejsFunction;
  renderPlanBuilder: nodejs.NodejsFunction;
  finalComposition: nodejs.NodejsFunction;
  reviewRequest: nodejs.NodejsFunction;
  uploadWorker: nodejs.NodejsFunction;
  metricsCollector: nodejs.NodejsFunction;
};

type CreateWorkflowLambdasProps = {
  projectPrefix: string;
  envConfig: VideoFactoryEnvConfig;
  assetsBucket: s3.Bucket;
  jobsTable: dynamodb.Table;
  llmConfigTable: dynamodb.Table;
  reviewQueue: sqs.Queue;
  previewDistribution: cloudfront.Distribution;
  renderInfra: {
    cluster: ecs.ICluster;
    taskDefinition: ecs.FargateTaskDefinition;
    taskDefinitionFamily: string;
    securityGroup: ec2.ISecurityGroup;
    vpc: ec2.IVpc;
    containerName: string;
  };
};

const createLambda = (
  scope: Construct,
  id: string,
  functionName: string,
  entry: string,
  environment: Record<string, string>,
  timeout = Duration.seconds(120),
): nodejs.NodejsFunction => {
  return new nodejs.NodejsFunction(scope, id, {
    functionName,
    entry,
    handler: "handler",
    runtime: lambda.Runtime.NODEJS_20_X,
    timeout,
    bundling: {
      target: "node20",
      format: nodejs.OutputFormat.CJS,
    },
    environment,
  });
};

export const createWorkflowLambdas = (
  scope: Construct,
  props: CreateWorkflowLambdasProps,
): WorkflowLambdas => {
  const configuredSecretIds = [
    props.envConfig.openAiSecretId,
    props.envConfig.byteplusImageSecretId,
    props.envConfig.byteplusVideoSecretId,
    props.envConfig.runwaySecretId,
    props.envConfig.elevenLabsSecretId,
    props.envConfig.shotstackSecretId,
  ].filter((value): value is string => typeof value === "string" && value.length > 0);
  const environment = {
    ASSETS_BUCKET_NAME: props.assetsBucket.bucketName,
    JOBS_TABLE_NAME: props.jobsTable.tableName,
    CONFIG_TABLE_NAME: props.llmConfigTable.tableName,
    REVIEW_QUEUE_URL: props.reviewQueue.queueUrl,
    DEFAULT_CONTENT_ID: props.envConfig.defaultContentId,
    DEFAULT_LANGUAGE: props.envConfig.defaultLanguage,
    BYTEPLUS_IMAGE_SECRET_ID: props.envConfig.byteplusImageSecretId ?? "",
    BYTEPLUS_VIDEO_SECRET_ID: props.envConfig.byteplusVideoSecretId ?? "",
    RUNWAY_SECRET_ID: props.envConfig.runwaySecretId,
    OPENAI_SECRET_ID: props.envConfig.openAiSecretId,
    ELEVENLABS_SECRET_ID: props.envConfig.elevenLabsSecretId,
    SHOTSTACK_SECRET_ID: props.envConfig.shotstackSecretId,
    ENABLE_FARGATE_COMPOSITION: props.envConfig.enableFargateComposition
      ? "true"
      : "false",
    FARGATE_RENDER_CLUSTER_ARN: props.renderInfra.cluster.clusterArn,
    FARGATE_RENDER_TASK_DEFINITION_FAMILY:
      props.renderInfra.taskDefinitionFamily,
    FARGATE_RENDER_CONTAINER_NAME: props.renderInfra.containerName,
    FARGATE_RENDER_SECURITY_GROUP_ID:
      props.renderInfra.securityGroup.securityGroupId,
    FARGATE_RENDER_SUBNET_IDS: props.renderInfra.vpc.publicSubnets
      .map((subnet) => subnet.subnetId)
      .join(","),
    YOUTUBE_SECRETS_JSON: JSON.stringify(props.envConfig.youtubeSecrets ?? {}),
    CHANNEL_CONFIGS_JSON: JSON.stringify(props.envConfig.channelConfigs ?? {}),
    PREVIEW_DISTRIBUTION_DOMAIN:
      props.previewDistribution.distributionDomainName,
  };

  const lambdas: WorkflowLambdas = {
    topicPlanner: createLambda(
      scope,
      "TopicPlannerLambda",
      `${props.projectPrefix}-workflow-topic-planner`,
      path.join(process.cwd(), "services/topic/handler.ts"),
      environment,
    ),
    sceneJsonBuilder: createLambda(
      scope,
      "SceneJsonBuilderLambda",
      `${props.projectPrefix}-workflow-scene-json-builder`,
      path.join(process.cwd(), "services/script/handler.ts"),
      environment,
    ),
    imageGenerator: createLambda(
      scope,
      "ImageGeneratorLambda",
      `${props.projectPrefix}-workflow-image-generator`,
      path.join(process.cwd(), "services/image/handler.ts"),
      environment,
    ),
    videoGenerator: createLambda(
      scope,
      "VideoGeneratorLambda",
      `${props.projectPrefix}-workflow-video-generator`,
      path.join(process.cwd(), "services/video-generation/handler.ts"),
      environment,
    ),
    ttsGenerator: createLambda(
      scope,
      "TtsGeneratorLambda",
      `${props.projectPrefix}-workflow-tts-generator`,
      path.join(process.cwd(), "services/voice/handler.ts"),
      environment,
    ),
    assetValidator: createLambda(
      scope,
      "AssetValidatorLambda",
      `${props.projectPrefix}-workflow-asset-validator`,
      path.join(
        process.cwd(),
        "services/composition/validate-assets/handler.ts",
      ),
      environment,
    ),
    renderPlanBuilder: createLambda(
      scope,
      "RenderPlanBuilderLambda",
      `${props.projectPrefix}-workflow-render-plan-builder`,
      path.join(process.cwd(), "services/composition/render-plan/handler.ts"),
      environment,
    ),
    finalComposition: createLambda(
      scope,
      "FinalCompositionLambda",
      `${props.projectPrefix}-workflow-final-composition`,
      path.join(
        process.cwd(),
        "services/composition/final-composition/handler.ts",
      ),
      environment,
      Duration.minutes(15),
    ),
    reviewRequest: createLambda(
      scope,
      "ReviewRequestLambda",
      `${props.projectPrefix}-workflow-review-request`,
      path.join(process.cwd(), "services/publish/review-request/handler.ts"),
      environment,
    ),
    uploadWorker: createLambda(
      scope,
      "UploadWorkerLambda",
      `${props.projectPrefix}-workflow-upload-worker`,
      path.join(process.cwd(), "services/publish/upload-worker/handler.ts"),
      environment,
    ),
    metricsCollector: createLambda(
      scope,
      "WorkflowMetricsCollectorLambda",
      `${props.projectPrefix}-workflow-metrics-collector`,
      path.join(process.cwd(), "services/publish/metrics/handler.ts"),
      environment,
    ),
  };

  for (const lambdaFn of Object.values(lambdas)) {
    props.assetsBucket.grantReadWrite(lambdaFn);
    props.jobsTable.grantReadWriteData(lambdaFn);
    props.llmConfigTable.grantReadWriteData(lambdaFn);
    for (const secretId of configuredSecretIds) {
      secretsmanager.Secret.fromSecretNameV2(
        scope,
        `${lambdaFn.node.id}${secretId.replace(/[^A-Za-z0-9]/g, "")}Secret`,
        secretId,
      ).grantRead(lambdaFn);
    }
    lambdaFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: ["*"],
      }),
    );
    lambdaFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
        ],
        resources: ["*"],
      }),
    );
  }

  props.reviewQueue.grantSendMessages(lambdas.reviewRequest);
  const fargateRunner = lambdas.finalComposition;
  fargateRunner.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ["ecs:RunTask"],
      resources: ["*"],
    }),
  );
  fargateRunner.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ["ecs:DescribeTasks"],
      resources: ["*"],
    }),
  );
  fargateRunner.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ["iam:PassRole"],
      resources: [
        props.renderInfra.taskDefinition.executionRole?.roleArn ?? "*",
        props.renderInfra.taskDefinition.taskRole.roleArn,
      ],
    }),
  );

  return lambdas;
};
