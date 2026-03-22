import * as path from "path";
import { CfnOutput, Duration, Stack, StackProps } from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { BaseStackProps } from "./config";
import { createPublishApi } from "./modules/publish/api";
import { createPublishAuth } from "./modules/publish/auth";
import { createPublishGraphqlApi } from "./modules/publish/graphql-api";

export type PublishStackProps = StackProps &
  BaseStackProps & {
    assetsBucket: s3.Bucket;
    jobsTable: dynamodb.Table;
    llmConfigTable: dynamodb.Table;
    reviewQueue: sqs.Queue;
    stateMachine: sfn.StateMachine;
  };

const createLambda = (
  scope: Construct,
  id: string,
  functionName: string,
  entry: string,
  environment: Record<string, string>,
): nodejs.NodejsFunction => {
  return new nodejs.NodejsFunction(scope, id, {
    functionName,
    entry,
    handler: "handler",
    runtime: lambda.Runtime.NODEJS_20_X,
    timeout: Duration.seconds(30),
    bundling: {
      target: "node20",
      format: nodejs.OutputFormat.CJS,
    },
    environment,
  });
};

export class PublishStack extends Stack {
  constructor(scope: Construct, id: string, props: PublishStackProps) {
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

    const environment = {
      ASSETS_BUCKET_NAME: props.assetsBucket.bucketName,
      JOBS_TABLE_NAME: props.jobsTable.tableName,
      CONFIG_TABLE_NAME: props.llmConfigTable.tableName,
      REVIEW_QUEUE_URL: props.reviewQueue.queueUrl,
      BYTEPLUS_IMAGE_SECRET_ID: props.envConfig.byteplusImageSecretId ?? "",
      BYTEPLUS_VIDEO_SECRET_ID: props.envConfig.byteplusVideoSecretId ?? "",
      OPENAI_SECRET_ID: props.envConfig.openAiSecretId,
      RUNWAY_SECRET_ID: props.envConfig.runwaySecretId,
      ELEVENLABS_SECRET_ID: props.envConfig.elevenLabsSecretId,
      YOUTUBE_SECRETS_JSON: JSON.stringify(
        props.envConfig.youtubeSecrets ?? {},
      ),
      CHANNEL_CONFIGS_JSON: JSON.stringify(
        props.envConfig.channelConfigs ?? {},
      ),
    };

    const pipelineWorker = new nodejs.NodejsFunction(
      this,
      "AdminPipelineWorkerLambda",
      {
        functionName: `${props.projectPrefix}-admin-pipeline-worker`,
        entry: path.join(
          process.cwd(),
          "services/admin/pipeline-worker/handler.ts",
        ),
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_20_X,
        timeout: Duration.minutes(15),
        bundling: {
          target: "node20",
          format: nodejs.OutputFormat.CJS,
        },
        environment,
      },
    );
    props.jobsTable.grantReadWriteData(pipelineWorker);
    props.assetsBucket.grantReadWrite(pipelineWorker);
    props.llmConfigTable.grantReadData(pipelineWorker);
    pipelineWorker.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: ["*"],
      }),
    );
    pipelineWorker.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
        ],
        resources: ["*"],
      }),
    );

    const pipelineTriggerEnv = {
      ...environment,
      PIPELINE_WORKER_FUNCTION_NAME: pipelineWorker.functionName,
      PIPELINE_ASYNC_INVOCATION: "1",
    };

    const reviewHandler = createLambda(
      this,
      "ReviewDecisionLambda",
      `${props.projectPrefix}-publish-review-decision`,
      path.join(process.cwd(), "services/publish/review/handler.ts"),
      environment,
    );

    const uploadHandler = createLambda(
      this,
      "UploadLambda",
      `${props.projectPrefix}-publish-upload`,
      path.join(process.cwd(), "services/publish/upload/handler.ts"),
      environment,
    );

    const metricsCollector = createLambda(
      this,
      "MetricsCollectorLambda",
      `${props.projectPrefix}-publish-metrics-collector`,
      path.join(process.cwd(), "services/publish/metrics/handler.ts"),
      environment,
    );

    const agentJobsDlq = new sqs.Queue(this, "AgentJobsDlq", {
      queueName: `${props.projectPrefix}-agent-jobs-dlq`,
      retentionPeriod: Duration.days(14),
    });

    const trendScoutJobsQueue = new sqs.Queue(this, "TrendScoutJobsQueue", {
      queueName: `${props.projectPrefix}-trend-scout-jobs`,
      visibilityTimeout: Duration.minutes(5),
      deadLetterQueue: {
        queue: agentJobsDlq,
        maxReceiveCount: 3,
      },
    });

    const trendScoutAgentLambda = new nodejs.NodejsFunction(
      this,
      "TrendScoutAgentLambda",
      {
        functionName: `${props.projectPrefix}-agent-trend-scout`,
        entry: path.join(
          process.cwd(),
          "services/agents/trend-scout/handler.ts",
        ),
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_20_X,
        timeout: Duration.minutes(2),
        bundling: {
          target: "node20",
          format: nodejs.OutputFormat.CJS,
        },
        environment,
      },
    );
    trendScoutAgentLambda.addEventSource(
      new lambdaEventSources.SqsEventSource(trendScoutJobsQueue, {
        batchSize: 1,
      }),
    );
    props.jobsTable.grantReadWriteData(trendScoutAgentLambda);

    const channelEvaluationJobsQueue = new sqs.Queue(
      this,
      "ChannelEvaluationJobsQueue",
      {
        queueName: `${props.projectPrefix}-channel-evaluation-jobs`,
        visibilityTimeout: Duration.minutes(5),
        deadLetterQueue: {
          queue: agentJobsDlq,
          maxReceiveCount: 3,
        },
      },
    );

    const channelEvaluatorAgentLambda = new nodejs.NodejsFunction(
      this,
      "ChannelEvaluatorAgentLambda",
      {
        functionName: `${props.projectPrefix}-agent-channel-evaluator`,
        entry: path.join(
          process.cwd(),
          "services/agents/channel-evaluator/handler.ts",
        ),
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_20_X,
        timeout: Duration.minutes(2),
        bundling: {
          target: "node20",
          format: nodejs.OutputFormat.CJS,
        },
        environment,
      },
    );
    channelEvaluatorAgentLambda.addEventSource(
      new lambdaEventSources.SqsEventSource(channelEvaluationJobsQueue, {
        batchSize: 1,
      }),
    );
    props.jobsTable.grantReadWriteData(channelEvaluatorAgentLambda);

    const listJobsResolver = createLambda(
      this,
      "AdminListJobsResolverLambda",
      `${props.projectPrefix}-admin-list-jobs`,
      path.join(process.cwd(), "services/admin/graphql/list-jobs/handler.ts"),
      environment,
    );
    const getJobResolver = createLambda(
      this,
      "AdminGetJobResolverLambda",
      `${props.projectPrefix}-admin-get-job`,
      path.join(process.cwd(), "services/admin/graphql/get-job/handler.ts"),
      environment,
    );
    const pendingReviewsResolver = createLambda(
      this,
      "AdminPendingReviewsResolverLambda",
      `${props.projectPrefix}-admin-pending-reviews`,
      path.join(
        process.cwd(),
        "services/admin/graphql/pending-reviews/handler.ts",
      ),
      environment,
    );
    const jobTimelineResolver = createLambda(
      this,
      "AdminJobTimelineResolverLambda",
      `${props.projectPrefix}-admin-job-timeline`,
      path.join(
        process.cwd(),
        "services/admin/graphql/job-timeline/handler.ts",
      ),
      environment,
    );
    const jobExecutionsResolver = createLambda(
      this,
      "AdminJobExecutionsResolverLambda",
      `${props.projectPrefix}-admin-job-executions`,
      path.join(
        process.cwd(),
        "services/admin/graphql/job-executions/handler.ts",
      ),
      environment,
    );
    const submitReviewDecisionResolver = createLambda(
      this,
      "AdminSubmitReviewDecisionResolverLambda",
      `${props.projectPrefix}-admin-submit-review-decision`,
      path.join(
        process.cwd(),
        "services/admin/graphql/submit-review-decision/handler.ts",
      ),
      environment,
    );
    const requestUploadResolver = createLambda(
      this,
      "AdminRequestUploadResolverLambda",
      `${props.projectPrefix}-admin-request-upload`,
      path.join(
        process.cwd(),
        "services/admin/graphql/request-upload/handler.ts",
      ),
      environment,
    );
    const getLlmSettingsResolver = createLambda(
      this,
      "AdminGetLlmSettingsResolverLambda",
      `${props.projectPrefix}-admin-get-llm-settings`,
      path.join(
        process.cwd(),
        "services/admin/graphql/get-llm-settings/handler.ts",
      ),
      environment,
    );
    const updateLlmSettingsResolver = createLambda(
      this,
      "AdminUpdateLlmSettingsResolverLambda",
      `${props.projectPrefix}-admin-update-llm-settings`,
      path.join(
        process.cwd(),
        "services/admin/graphql/update-llm-settings/handler.ts",
      ),
      environment,
    );
    const getJobDraftResolver = createLambda(
      this,
      "AdminGetJobDraftResolverLambda",
      `${props.projectPrefix}-admin-get-job-draft`,
      path.join(
        process.cwd(),
        "services/admin/graphql/get-job-draft/handler.ts",
      ),
      environment,
    );
    const createDraftJobResolver = createLambda(
      this,
      "AdminCreateDraftJobResolverLambda",
      `${props.projectPrefix}-admin-create-draft-job`,
      path.join(
        process.cwd(),
        "services/admin/graphql/create-draft-job/handler.ts",
      ),
      pipelineTriggerEnv,
    );
    const updateTopicSeedResolver = createLambda(
      this,
      "AdminUpdateTopicSeedResolverLambda",
      `${props.projectPrefix}-admin-update-topic-seed`,
      path.join(
        process.cwd(),
        "services/admin/graphql/update-topic-seed/handler.ts",
      ),
      environment,
    );
    const runTopicPlanResolver = createLambda(
      this,
      "AdminRunTopicPlanResolverLambda",
      `${props.projectPrefix}-admin-run-topic-plan`,
      path.join(
        process.cwd(),
        "services/admin/graphql/run-topic-plan/handler.ts",
      ),
      pipelineTriggerEnv,
    );
    const runSceneJsonResolver = createLambda(
      this,
      "AdminRunSceneJsonResolverLambda",
      `${props.projectPrefix}-admin-run-scene-json`,
      path.join(
        process.cwd(),
        "services/admin/graphql/run-scene-json/handler.ts",
      ),
      pipelineTriggerEnv,
    );
    const updateSceneJsonResolver = createLambda(
      this,
      "AdminUpdateSceneJsonResolverLambda",
      `${props.projectPrefix}-admin-update-scene-json`,
      path.join(
        process.cwd(),
        "services/admin/graphql/update-scene-json/handler.ts",
      ),
      environment,
    );
    const runAssetGenerationResolver = createLambda(
      this,
      "AdminRunAssetGenerationResolverLambda",
      `${props.projectPrefix}-admin-run-asset-generation`,
      path.join(
        process.cwd(),
        "services/admin/graphql/run-asset-generation/handler.ts",
      ),
      pipelineTriggerEnv,
    );
    const selectSceneImageCandidateResolver = createLambda(
      this,
      "AdminSelectSceneImageCandidateResolverLambda",
      `${props.projectPrefix}-admin-select-scene-image-candidate`,
      path.join(
        process.cwd(),
        "services/admin/graphql/select-scene-image-candidate/handler.ts",
      ),
      environment,
    );
    const runFinalCompositionResolver = createLambda(
      this,
      "AdminRunFinalCompositionResolverLambda",
      `${props.projectPrefix}-admin-run-final-composition`,
      path.join(
        process.cwd(),
        "services/admin/graphql/run-final-composition/handler.ts",
      ),
      {
        ...environment,
        SHOTSTACK_SECRET_ID: props.envConfig.shotstackSecretId,
      },
    );
    const deleteJobResolver = createLambda(
      this,
      "AdminDeleteJobResolverLambda",
      `${props.projectPrefix}-admin-delete-job`,
      path.join(process.cwd(), "services/admin/graphql/delete-job/handler.ts"),
      environment,
    );
    const attachJobToContentResolver = createLambda(
      this,
      "AdminAttachJobToContentResolverLambda",
      `${props.projectPrefix}-admin-attach-job-to-content`,
      path.join(
        process.cwd(),
        "services/admin/graphql/attach-job-to-content/handler.ts",
      ),
      environment,
    );
    const approvePipelineExecutionResolver = createLambda(
      this,
      "AdminApprovePipelineExecutionResolverLambda",
      `${props.projectPrefix}-admin-approve-pipeline-execution`,
      path.join(
        process.cwd(),
        "services/admin/graphql/approve-pipeline-execution/handler.ts",
      ),
      environment,
    );
    const channelPublishQueueResolver = createLambda(
      this,
      "AdminChannelPublishQueueResolverLambda",
      `${props.projectPrefix}-admin-channel-publish-queue`,
      path.join(
        process.cwd(),
        "services/admin/graphql/list-channel-publish-queue/handler.ts",
      ),
      environment,
    );
    const enqueueToChannelPublishQueueResolver = createLambda(
      this,
      "AdminEnqueueToChannelPublishQueueResolverLambda",
      `${props.projectPrefix}-admin-enqueue-channel-publish-queue`,
      path.join(
        process.cwd(),
        "services/admin/graphql/enqueue-to-channel-publish-queue/handler.ts",
      ),
      environment,
    );
    const platformConnectionsResolver = createLambda(
      this,
      "AdminPlatformConnectionsResolverLambda",
      `${props.projectPrefix}-admin-platform-connections`,
      path.join(
        process.cwd(),
        "services/admin/graphql/list-platform-connections/handler.ts",
      ),
      environment,
    );
    /** Large bundle → slow cold start; extra memory speeds init. Dynamo list paths use BatchGet. */
    const publishDomainResolver = new nodejs.NodejsFunction(
      this,
      "AdminPublishDomainResolverLambda",
      {
        functionName: `${props.projectPrefix}-admin-publish-domain-router`,
        entry: path.join(
          process.cwd(),
          "services/admin/graphql/publish-domain-router/handler.ts",
        ),
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_20_X,
        timeout: Duration.seconds(30),
        memorySize: 1536,
        bundling: {
          target: "node20",
          format: nodejs.OutputFormat.CJS,
        },
        environment: {
          ...environment,
          TREND_SCOUT_QUEUE_URL: trendScoutJobsQueue.queueUrl,
        },
      },
    );
    const listContentsResolver = createLambda(
      this,
      "AdminListContentsResolverLambda",
      `${props.projectPrefix}-admin-list-contents`,
      path.join(
        process.cwd(),
        "services/admin/graphql/list-contents/handler.ts",
      ),
      environment,
    );
    const createContentResolver = createLambda(
      this,
      "AdminCreateContentResolverLambda",
      `${props.projectPrefix}-admin-create-content`,
      path.join(
        process.cwd(),
        "services/admin/graphql/create-content/handler.ts",
      ),
      environment,
    );
    const deleteContentResolver = createLambda(
      this,
      "AdminDeleteContentResolverLambda",
      `${props.projectPrefix}-admin-delete-content`,
      path.join(
        process.cwd(),
        "services/admin/graphql/delete-content/handler.ts",
      ),
      environment,
    );
    const updateContentResolver = createLambda(
      this,
      "AdminUpdateContentResolverLambda",
      `${props.projectPrefix}-admin-update-content`,
      path.join(
        process.cwd(),
        "services/admin/graphql/update-content/handler.ts",
      ),
      environment,
    );

    props.assetsBucket.grantReadWrite(reviewHandler);
    props.assetsBucket.grantReadWrite(uploadHandler);
    props.assetsBucket.grantRead(metricsCollector);
    props.jobsTable.grantReadWriteData(reviewHandler);
    props.jobsTable.grantReadWriteData(uploadHandler);
    props.jobsTable.grantReadData(metricsCollector);
    props.reviewQueue.grantConsumeMessages(reviewHandler);
    props.stateMachine.grantTaskResponse(reviewHandler);
    uploadHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: ["*"],
      }),
    );
    props.jobsTable.grantReadData(listContentsResolver);
    props.jobsTable.grantReadData(listJobsResolver);
    props.jobsTable.grantReadData(getJobResolver);
    props.jobsTable.grantReadData(pendingReviewsResolver);
    props.jobsTable.grantReadData(jobTimelineResolver);
    props.jobsTable.grantReadData(jobExecutionsResolver);
    props.jobsTable.grantReadWriteData(submitReviewDecisionResolver);
    props.jobsTable.grantReadWriteData(requestUploadResolver);
    props.jobsTable.grantReadWriteData(getJobDraftResolver);
    props.jobsTable.grantReadWriteData(createDraftJobResolver);
    props.jobsTable.grantReadWriteData(updateTopicSeedResolver);
    props.jobsTable.grantReadWriteData(runTopicPlanResolver);
    props.jobsTable.grantReadWriteData(runSceneJsonResolver);
    props.jobsTable.grantReadWriteData(updateSceneJsonResolver);
    props.jobsTable.grantReadWriteData(runAssetGenerationResolver);
    props.jobsTable.grantReadWriteData(selectSceneImageCandidateResolver);
    props.jobsTable.grantReadWriteData(runFinalCompositionResolver);
    props.jobsTable.grantReadWriteData(deleteJobResolver);
    props.jobsTable.grantReadWriteData(attachJobToContentResolver);
    props.jobsTable.grantReadWriteData(approvePipelineExecutionResolver);
    props.jobsTable.grantReadData(channelPublishQueueResolver);
    props.jobsTable.grantReadWriteData(enqueueToChannelPublishQueueResolver);
    props.jobsTable.grantReadData(platformConnectionsResolver);
    props.jobsTable.grantReadWriteData(publishDomainResolver);
    props.assetsBucket.grantRead(publishDomainResolver);
    trendScoutJobsQueue.grantSendMessages(publishDomainResolver);
    publishDomainResolver.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: ["*"],
      }),
    );
    props.jobsTable.grantReadWriteData(createContentResolver);
    props.jobsTable.grantReadWriteData(updateContentResolver);
    props.jobsTable.grantReadWriteData(deleteContentResolver);
    props.assetsBucket.grantReadWrite(getJobDraftResolver);
    props.assetsBucket.grantReadWrite(createDraftJobResolver);
    props.assetsBucket.grantReadWrite(updateTopicSeedResolver);
    props.assetsBucket.grantReadWrite(runTopicPlanResolver);
    props.assetsBucket.grantReadWrite(runSceneJsonResolver);
    props.assetsBucket.grantReadWrite(updateSceneJsonResolver);
    props.assetsBucket.grantReadWrite(runAssetGenerationResolver);
    props.assetsBucket.grantReadWrite(selectSceneImageCandidateResolver);
    props.assetsBucket.grantReadWrite(runFinalCompositionResolver);
    props.assetsBucket.grantReadWrite(deleteJobResolver);
    props.assetsBucket.grantReadWrite(attachJobToContentResolver);
    props.llmConfigTable.grantReadData(getLlmSettingsResolver);
    props.llmConfigTable.grantReadWriteData(updateLlmSettingsResolver);
    /** generateStepStructuredData → getLlmStepSettings(GetItem) */
    props.llmConfigTable.grantReadData(createDraftJobResolver);
    props.llmConfigTable.grantReadData(runTopicPlanResolver);
    props.llmConfigTable.grantReadData(runSceneJsonResolver);
    props.stateMachine.grantTaskResponse(submitReviewDecisionResolver);
    runTopicPlanResolver.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: ["*"],
      }),
    );
    runSceneJsonResolver.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: ["*"],
      }),
    );
    runAssetGenerationResolver.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: ["*"],
      }),
    );
    runFinalCompositionResolver.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: ["*"],
      }),
    );
    runTopicPlanResolver.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
        ],
        resources: ["*"],
      }),
    );
    createDraftJobResolver.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: ["*"],
      }),
    );
    createDraftJobResolver.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
        ],
        resources: ["*"],
      }),
    );
    runSceneJsonResolver.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
        ],
        resources: ["*"],
      }),
    );

    pipelineWorker.grantInvoke(createDraftJobResolver);
    pipelineWorker.grantInvoke(runTopicPlanResolver);
    pipelineWorker.grantInvoke(runSceneJsonResolver);
    pipelineWorker.grantInvoke(runAssetGenerationResolver);

    const auth = createPublishAuth(this, {
      projectPrefix: props.projectPrefix,
      domainPrefix:
        props.envConfig.adminUserPoolDomainPrefix ??
        `${props.projectPrefix}-admin-auth`,
      enableSignup: props.envConfig.enableAdminSignup ?? false,
      callbackUrls: props.envConfig.adminCallbackUrls ?? [],
      logoutUrls: props.envConfig.adminLogoutUrls ?? [],
      googleOAuthSecretId: props.envConfig.googleOAuthSecretId,
    });

    const adminGraphql = createPublishGraphqlApi(this, {
      projectPrefix: props.projectPrefix,
      userPool: auth.userPool,
      listContentsResolver,
      listJobsResolver,
      getJobResolver,
      pendingReviewsResolver,
      jobTimelineResolver,
      jobExecutionsResolver,
      submitReviewDecisionResolver,
      requestUploadResolver,
      getLlmSettingsResolver,
      updateLlmSettingsResolver,
      getJobDraftResolver,
      createContentResolver,
      updateContentResolver,
      deleteContentResolver,
      createDraftJobResolver,
      updateTopicSeedResolver,
      runTopicPlanResolver,
      runSceneJsonResolver,
      updateSceneJsonResolver,
      runAssetGenerationResolver,
      selectSceneImageCandidateResolver,
      runFinalCompositionResolver,
      deleteJobResolver,
      attachJobToContentResolver,
      approvePipelineExecutionResolver,
      channelPublishQueueResolver,
      enqueueToChannelPublishQueueResolver,
      platformConnectionsResolver,
      publishDomainResolver,
    });

    const publishApi = createPublishApi(this, reviewHandler, uploadHandler);

    new events.Rule(this, "MetricsCollectionSchedule", {
      schedule: events.Schedule.rate(Duration.hours(6)),
      targets: [new targets.LambdaFunction(metricsCollector)],
    });

    new CfnOutput(this, "PublishApiUrl", {
      value: publishApi.api.url,
    });
    new CfnOutput(this, "AdminGraphqlUrl", {
      value: adminGraphql.graphqlApi.graphqlUrl,
    });
    new CfnOutput(this, "AdminUserPoolId", {
      value: auth.userPool.userPoolId,
    });
    new CfnOutput(this, "AdminUserPoolClientId", {
      value: auth.userPoolClient.userPoolClientId,
    });
  }
}
