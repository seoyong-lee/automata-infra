import * as path from "path";
import { Duration } from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
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
};

type CreateWorkflowLambdasProps = {
  projectPrefix: string;
  envConfig: VideoFactoryEnvConfig;
  assetsBucket: s3.Bucket;
  jobsTable: dynamodb.Table;
  reviewQueue: sqs.Queue;
};

const createLambda = (
  scope: Construct,
  id: string,
  entry: string,
  environment: Record<string, string>,
): nodejs.NodejsFunction => {
  return new nodejs.NodejsFunction(scope, id, {
    entry,
    handler: "handler",
    runtime: lambda.Runtime.NODEJS_20_X,
    timeout: Duration.seconds(120),
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
  const environment = {
    ASSETS_BUCKET_NAME: props.assetsBucket.bucketName,
    JOBS_TABLE_NAME: props.jobsTable.tableName,
    REVIEW_QUEUE_URL: props.reviewQueue.queueUrl,
    CHANNEL_ID: props.envConfig.channelId,
    DEFAULT_LANGUAGE: props.envConfig.defaultLanguage,
    RUNWAY_SECRET_ID: props.envConfig.runwaySecretId,
    OPENAI_SECRET_ID: props.envConfig.openAiSecretId,
    ELEVENLABS_SECRET_ID: props.envConfig.elevenLabsSecretId,
    SHOTSTACK_SECRET_ID: props.envConfig.shotstackSecretId,
  };

  const lambdas: WorkflowLambdas = {
    topicPlanner: createLambda(
      scope,
      "TopicPlannerLambda",
      path.join(process.cwd(), "services/topic/handler.ts"),
      environment,
    ),
    sceneJsonBuilder: createLambda(
      scope,
      "SceneJsonBuilderLambda",
      path.join(process.cwd(), "services/script/handler.ts"),
      environment,
    ),
    imageGenerator: createLambda(
      scope,
      "ImageGeneratorLambda",
      path.join(process.cwd(), "services/image/handler.ts"),
      environment,
    ),
    videoGenerator: createLambda(
      scope,
      "VideoGeneratorLambda",
      path.join(process.cwd(), "services/video-generation/handler.ts"),
      environment,
    ),
    ttsGenerator: createLambda(
      scope,
      "TtsGeneratorLambda",
      path.join(process.cwd(), "services/voice/handler.ts"),
      environment,
    ),
    assetValidator: createLambda(
      scope,
      "AssetValidatorLambda",
      path.join(
        process.cwd(),
        "services/composition/validate-assets/handler.ts",
      ),
      environment,
    ),
    renderPlanBuilder: createLambda(
      scope,
      "RenderPlanBuilderLambda",
      path.join(process.cwd(), "services/composition/render-plan/handler.ts"),
      environment,
    ),
    finalComposition: createLambda(
      scope,
      "FinalCompositionLambda",
      path.join(
        process.cwd(),
        "services/composition/final-composition/handler.ts",
      ),
      environment,
    ),
    reviewRequest: createLambda(
      scope,
      "ReviewRequestLambda",
      path.join(process.cwd(), "services/publish/review-request/handler.ts"),
      environment,
    ),
    uploadWorker: createLambda(
      scope,
      "UploadWorkerLambda",
      path.join(process.cwd(), "services/publish/upload-worker/handler.ts"),
      environment,
    ),
  };

  for (const lambdaFn of Object.values(lambdas)) {
    props.assetsBucket.grantReadWrite(lambdaFn);
    props.jobsTable.grantReadWriteData(lambdaFn);
  }

  props.reviewQueue.grantSendMessages(lambdas.reviewRequest);

  return lambdas;
};
