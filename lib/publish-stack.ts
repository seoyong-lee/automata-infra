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
  entry: string,
  environment: Record<string, string>,
): nodejs.NodejsFunction => {
  return new nodejs.NodejsFunction(scope, id, {
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

    const reviewHandler = createLambda(
      this,
      "ReviewDecisionLambda",
      path.join(process.cwd(), "services/publish/review/handler.ts"),
      environment,
    );

    const uploadHandler = createLambda(
      this,
      "UploadLambda",
      path.join(process.cwd(), "services/publish/upload/handler.ts"),
      environment,
    );

    const metricsCollector = createLambda(
      this,
      "MetricsCollectorLambda",
      path.join(process.cwd(), "services/publish/metrics/handler.ts"),
      environment,
    );

    const listJobsResolver = createLambda(
      this,
      "AdminListJobsResolverLambda",
      path.join(process.cwd(), "services/admin/graphql/list-jobs/handler.ts"),
      environment,
    );
    const getJobResolver = createLambda(
      this,
      "AdminGetJobResolverLambda",
      path.join(process.cwd(), "services/admin/graphql/get-job/handler.ts"),
      environment,
    );
    const pendingReviewsResolver = createLambda(
      this,
      "AdminPendingReviewsResolverLambda",
      path.join(
        process.cwd(),
        "services/admin/graphql/pending-reviews/handler.ts",
      ),
      environment,
    );
    const jobTimelineResolver = createLambda(
      this,
      "AdminJobTimelineResolverLambda",
      path.join(
        process.cwd(),
        "services/admin/graphql/job-timeline/handler.ts",
      ),
      environment,
    );
    const submitReviewDecisionResolver = createLambda(
      this,
      "AdminSubmitReviewDecisionResolverLambda",
      path.join(
        process.cwd(),
        "services/admin/graphql/submit-review-decision/handler.ts",
      ),
      environment,
    );
    const requestUploadResolver = createLambda(
      this,
      "AdminRequestUploadResolverLambda",
      path.join(
        process.cwd(),
        "services/admin/graphql/request-upload/handler.ts",
      ),
      environment,
    );
    const getLlmSettingsResolver = createLambda(
      this,
      "AdminGetLlmSettingsResolverLambda",
      path.join(
        process.cwd(),
        "services/admin/graphql/get-llm-settings/handler.ts",
      ),
      environment,
    );
    const updateLlmSettingsResolver = createLambda(
      this,
      "AdminUpdateLlmSettingsResolverLambda",
      path.join(
        process.cwd(),
        "services/admin/graphql/update-llm-settings/handler.ts",
      ),
      environment,
    );
    const getJobDraftResolver = createLambda(
      this,
      "AdminGetJobDraftResolverLambda",
      path.join(
        process.cwd(),
        "services/admin/graphql/get-job-draft/handler.ts",
      ),
      environment,
    );
    const createDraftJobResolver = createLambda(
      this,
      "AdminCreateDraftJobResolverLambda",
      path.join(
        process.cwd(),
        "services/admin/graphql/create-draft-job/handler.ts",
      ),
      environment,
    );
    const updateTopicSeedResolver = createLambda(
      this,
      "AdminUpdateTopicSeedResolverLambda",
      path.join(
        process.cwd(),
        "services/admin/graphql/update-topic-seed/handler.ts",
      ),
      environment,
    );
    const runTopicPlanResolver = createLambda(
      this,
      "AdminRunTopicPlanResolverLambda",
      path.join(
        process.cwd(),
        "services/admin/graphql/run-topic-plan/handler.ts",
      ),
      environment,
    );
    const runSceneJsonResolver = createLambda(
      this,
      "AdminRunSceneJsonResolverLambda",
      path.join(
        process.cwd(),
        "services/admin/graphql/run-scene-json/handler.ts",
      ),
      environment,
    );
    const updateSceneJsonResolver = createLambda(
      this,
      "AdminUpdateSceneJsonResolverLambda",
      path.join(
        process.cwd(),
        "services/admin/graphql/update-scene-json/handler.ts",
      ),
      environment,
    );
    const runAssetGenerationResolver = createLambda(
      this,
      "AdminRunAssetGenerationResolverLambda",
      path.join(
        process.cwd(),
        "services/admin/graphql/run-asset-generation/handler.ts",
      ),
      environment,
    );
    const deleteJobResolver = createLambda(
      this,
      "AdminDeleteJobResolverLambda",
      path.join(process.cwd(), "services/admin/graphql/delete-job/handler.ts"),
      environment,
    );
    const listContentsResolver = createLambda(
      this,
      "AdminListContentsResolverLambda",
      path.join(
        process.cwd(),
        "services/admin/graphql/list-contents/handler.ts",
      ),
      environment,
    );
    const createContentResolver = createLambda(
      this,
      "AdminCreateContentResolverLambda",
      path.join(
        process.cwd(),
        "services/admin/graphql/create-content/handler.ts",
      ),
      environment,
    );
    const deleteContentResolver = createLambda(
      this,
      "AdminDeleteContentResolverLambda",
      path.join(
        process.cwd(),
        "services/admin/graphql/delete-content/handler.ts",
      ),
      environment,
    );
    const updateContentResolver = createLambda(
      this,
      "AdminUpdateContentResolverLambda",
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
    props.jobsTable.grantReadWriteData(submitReviewDecisionResolver);
    props.jobsTable.grantReadWriteData(requestUploadResolver);
    props.jobsTable.grantReadWriteData(getJobDraftResolver);
    props.jobsTable.grantReadWriteData(createDraftJobResolver);
    props.jobsTable.grantReadWriteData(updateTopicSeedResolver);
    props.jobsTable.grantReadWriteData(runTopicPlanResolver);
    props.jobsTable.grantReadWriteData(runSceneJsonResolver);
    props.jobsTable.grantReadWriteData(updateSceneJsonResolver);
    props.jobsTable.grantReadWriteData(runAssetGenerationResolver);
    props.jobsTable.grantReadWriteData(deleteJobResolver);
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
    props.assetsBucket.grantReadWrite(deleteJobResolver);
    props.llmConfigTable.grantReadData(getLlmSettingsResolver);
    props.llmConfigTable.grantReadWriteData(updateLlmSettingsResolver);
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
    runTopicPlanResolver.addToRolePolicy(
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
      deleteJobResolver,
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
