import * as path from "path";
import { CfnOutput, Duration, Stack, StackProps } from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as s3 from "aws-cdk-lib/aws-s3";
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
    previewDistribution: cloudfront.Distribution;
    renderClusterArn: string;
    renderTaskDefinitionFamily: string;
    renderSecurityGroupId: string;
    renderSubnetIds: string[];
    renderContainerName: string;
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
      BYTEPLUS_IMAGE_SECRET_ID: props.envConfig.byteplusImageSecretId ?? "",
      BYTEPLUS_VIDEO_SECRET_ID: props.envConfig.byteplusVideoSecretId ?? "",
      OPENAI_SECRET_ID: props.envConfig.openAiSecretId,
      RUNWAY_SECRET_ID: props.envConfig.runwaySecretId,
      ELEVENLABS_SECRET_ID: props.envConfig.elevenLabsSecretId,
      SHOTSTACK_SECRET_ID: props.envConfig.shotstackSecretId,
      FARGATE_RENDER_CLUSTER_ARN: props.renderClusterArn,
      FARGATE_RENDER_TASK_DEFINITION_FAMILY: props.renderTaskDefinitionFamily,
      FARGATE_RENDER_CONTAINER_NAME: props.renderContainerName,
      FARGATE_RENDER_SECURITY_GROUP_ID: props.renderSecurityGroupId,
      FARGATE_RENDER_SUBNET_IDS: props.renderSubnetIds.join(","),
      YOUTUBE_SECRETS_JSON: JSON.stringify(
        props.envConfig.youtubeSecrets ?? {},
      ),
      CHANNEL_CONFIGS_JSON: JSON.stringify(
        props.envConfig.channelConfigs ?? {},
      ),
      PREVIEW_DISTRIBUTION_DOMAIN:
        props.previewDistribution.distributionDomainName,
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
    const grantFargateRunPermissions = (fn: lambda.IFunction) => {
      fn.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ["ecs:RunTask"],
          resources: ["*"],
        }),
      );
      fn.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ["ecs:DescribeTasks"],
          resources: ["*"],
        }),
      );
      fn.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ["iam:PassRole"],
          resources: ["*"],
        }),
      );
    };
    grantFargateRunPermissions(pipelineWorker);

    const pipelineTriggerEnv = {
      ...environment,
      PIPELINE_WORKER_FUNCTION_NAME: pipelineWorker.functionName,
      PIPELINE_ASYNC_INVOCATION: "1",
    };

    const uploadHandler = createLambda(
      this,
      "UploadLambda",
      `${props.projectPrefix}-publish-upload`,
      path.join(process.cwd(), "services/publish/upload/handler.ts"),
      environment,
    );

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
    const requestAssetUploadResolver = createLambda(
      this,
      "AdminRequestAssetUploadResolverLambda",
      `${props.projectPrefix}-admin-request-asset-upload`,
      path.join(
        process.cwd(),
        "services/admin/graphql/request-asset-upload/handler.ts",
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
    const listVoiceProfilesResolver = createLambda(
      this,
      "AdminListVoiceProfilesResolverLambda",
      `${props.projectPrefix}-admin-list-voice-profiles`,
      path.join(
        process.cwd(),
        "services/admin/graphql/list-voice-profiles/handler.ts",
      ),
      environment,
    );
    const upsertVoiceProfileResolver = createLambda(
      this,
      "AdminUpsertVoiceProfileResolverLambda",
      `${props.projectPrefix}-admin-upsert-voice-profile`,
      path.join(
        process.cwd(),
        "services/admin/graphql/upsert-voice-profile/handler.ts",
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
    const updateJobBriefResolver = createLambda(
      this,
      "AdminUpdateJobBriefResolverLambda",
      `${props.projectPrefix}-admin-update-job-brief`,
      path.join(
        process.cwd(),
        "services/admin/graphql/update-job-brief/handler.ts",
      ),
      environment,
    );
    const runJobPlanResolver = createLambda(
      this,
      "AdminRunJobPlanResolverLambda",
      `${props.projectPrefix}-admin-run-job-plan`,
      path.join(
        process.cwd(),
        "services/admin/graphql/run-job-plan/handler.ts",
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
    const selectSceneVoiceCandidateResolver = createLambda(
      this,
      "AdminSelectSceneVoiceCandidateResolverLambda",
      `${props.projectPrefix}-admin-select-scene-voice-candidate`,
      path.join(
        process.cwd(),
        "services/admin/graphql/select-scene-voice-candidate/handler.ts",
      ),
      environment,
    );
    const setJobDefaultVoiceProfileResolver = createLambda(
      this,
      "AdminSetJobDefaultVoiceProfileResolverLambda",
      `${props.projectPrefix}-admin-set-job-default-voice-profile`,
      path.join(
        process.cwd(),
        "services/admin/graphql/set-job-default-voice-profile/handler.ts",
      ),
      environment,
    );
    const setJobBackgroundMusicResolver = createLambda(
      this,
      "AdminSetJobBackgroundMusicResolverLambda",
      `${props.projectPrefix}-admin-set-job-background-music`,
      path.join(
        process.cwd(),
        "services/admin/graphql/set-job-background-music/handler.ts",
      ),
      environment,
    );
    const setSceneVoiceProfileResolver = createLambda(
      this,
      "AdminSetSceneVoiceProfileResolverLambda",
      `${props.projectPrefix}-admin-set-scene-voice-profile`,
      path.join(
        process.cwd(),
        "services/admin/graphql/set-scene-voice-profile/handler.ts",
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
        ...pipelineTriggerEnv,
        SHOTSTACK_SECRET_ID: props.envConfig.shotstackSecretId,
      },
    );
    grantFargateRunPermissions(runFinalCompositionResolver);
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

    props.assetsBucket.grantRead(uploadHandler);
    props.assetsBucket.grantRead(requestUploadResolver);
    props.jobsTable.grantReadWriteData(uploadHandler);
    uploadHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: ["*"],
      }),
    );
    requestUploadResolver.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: ["*"],
      }),
    );
    props.jobsTable.grantReadData(listContentsResolver);
    props.jobsTable.grantReadData(listJobsResolver);
    props.jobsTable.grantReadData(getJobResolver);
    props.jobsTable.grantReadData(jobTimelineResolver);
    props.jobsTable.grantReadData(jobExecutionsResolver);
    props.jobsTable.grantReadWriteData(requestUploadResolver);
    props.jobsTable.grantReadWriteData(requestAssetUploadResolver);
    props.jobsTable.grantReadWriteData(getJobDraftResolver);
    props.jobsTable.grantReadWriteData(createDraftJobResolver);
    props.jobsTable.grantReadWriteData(updateJobBriefResolver);
    props.jobsTable.grantReadWriteData(runJobPlanResolver);
    props.jobsTable.grantReadWriteData(runSceneJsonResolver);
    props.jobsTable.grantReadWriteData(updateSceneJsonResolver);
    props.jobsTable.grantReadWriteData(runAssetGenerationResolver);
    props.jobsTable.grantReadWriteData(selectSceneImageCandidateResolver);
    props.jobsTable.grantReadWriteData(selectSceneVoiceCandidateResolver);
    props.jobsTable.grantReadWriteData(setJobDefaultVoiceProfileResolver);
    props.jobsTable.grantReadWriteData(setJobBackgroundMusicResolver);
    props.jobsTable.grantReadWriteData(setSceneVoiceProfileResolver);
    props.jobsTable.grantReadWriteData(runFinalCompositionResolver);
    props.jobsTable.grantReadWriteData(deleteJobResolver);
    props.jobsTable.grantReadWriteData(attachJobToContentResolver);
    props.jobsTable.grantReadWriteData(approvePipelineExecutionResolver);
    props.jobsTable.grantReadWriteData(createContentResolver);
    props.jobsTable.grantReadWriteData(updateContentResolver);
    props.jobsTable.grantReadWriteData(deleteContentResolver);
    props.assetsBucket.grantReadWrite(getJobDraftResolver);
    props.assetsBucket.grantReadWrite(createDraftJobResolver);
    props.assetsBucket.grantReadWrite(updateJobBriefResolver);
    props.assetsBucket.grantReadWrite(runJobPlanResolver);
    props.assetsBucket.grantReadWrite(runSceneJsonResolver);
    props.assetsBucket.grantReadWrite(updateSceneJsonResolver);
    props.assetsBucket.grantReadWrite(requestAssetUploadResolver);
    props.assetsBucket.grantReadWrite(runAssetGenerationResolver);
    props.assetsBucket.grantReadWrite(selectSceneImageCandidateResolver);
    props.assetsBucket.grantReadWrite(selectSceneVoiceCandidateResolver);
    props.assetsBucket.grantReadWrite(setJobDefaultVoiceProfileResolver);
    props.assetsBucket.grantReadWrite(setJobBackgroundMusicResolver);
    props.assetsBucket.grantReadWrite(setSceneVoiceProfileResolver);
    props.assetsBucket.grantReadWrite(runFinalCompositionResolver);
    props.assetsBucket.grantReadWrite(deleteJobResolver);
    props.assetsBucket.grantReadWrite(attachJobToContentResolver);
    props.llmConfigTable.grantReadData(getLlmSettingsResolver);
    props.llmConfigTable.grantReadWriteData(updateLlmSettingsResolver);
    props.llmConfigTable.grantReadData(listVoiceProfilesResolver);
    props.llmConfigTable.grantReadWriteData(upsertVoiceProfileResolver);
    props.llmConfigTable.grantReadData(runAssetGenerationResolver);
    props.llmConfigTable.grantReadData(setJobDefaultVoiceProfileResolver);
    props.llmConfigTable.grantReadData(setSceneVoiceProfileResolver);
    /** generateStepStructuredData → getLlmStepSettings(GetItem) */
    props.llmConfigTable.grantReadData(createDraftJobResolver);
    props.llmConfigTable.grantReadData(runJobPlanResolver);
    props.llmConfigTable.grantReadData(runSceneJsonResolver);
    runJobPlanResolver.addToRolePolicy(
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
    runJobPlanResolver.addToRolePolicy(
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
    pipelineWorker.grantInvoke(runJobPlanResolver);
    pipelineWorker.grantInvoke(runSceneJsonResolver);
    pipelineWorker.grantInvoke(runAssetGenerationResolver);
    pipelineWorker.grantInvoke(runFinalCompositionResolver);

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
      jobTimelineResolver,
      jobExecutionsResolver,
      requestUploadResolver,
      requestAssetUploadResolver,
      getLlmSettingsResolver,
      updateLlmSettingsResolver,
      listVoiceProfilesResolver,
      upsertVoiceProfileResolver,
      getJobDraftResolver,
      createContentResolver,
      updateContentResolver,
      deleteContentResolver,
      createDraftJobResolver,
      updateJobBriefResolver,
      runJobPlanResolver,
      runSceneJsonResolver,
      updateSceneJsonResolver,
      runAssetGenerationResolver,
      selectSceneImageCandidateResolver,
      selectSceneVoiceCandidateResolver,
      setJobDefaultVoiceProfileResolver,
      setJobBackgroundMusicResolver,
      setSceneVoiceProfileResolver,
      runFinalCompositionResolver,
      deleteJobResolver,
      attachJobToContentResolver,
      approvePipelineExecutionResolver,
    });

    const publishApi = createPublishApi(this, uploadHandler);

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
