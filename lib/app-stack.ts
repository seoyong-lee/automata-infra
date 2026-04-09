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
import { createPreviewDistribution } from "./modules/shared/cdn";
import { createLlmConfigTable } from "./modules/shared/llm-config-table";
import { createObservabilityDashboard } from "./modules/shared/observability";
import { createAssetsBucket } from "./modules/shared/storage";
import { createJobsTable } from "./modules/workflow/jobs-table";
import { createWorkflowRenderInfrastructure } from "./modules/workflow/render-infra";

export type AppStackProps = StackProps & BaseStackProps;

type ResolvedFargateConfig = {
  clusterArn: string;
  taskDefinitionFamily: string;
  securityGroupId: string;
  subnetIds: string[];
  containerName: string;
};

const createLambda = (
  scope: Construct,
  id: string,
  functionName: string,
  entry: string,
  environment: Record<string, string>,
  timeout: Duration = Duration.seconds(30),
  memorySize: number = 512,
): nodejs.NodejsFunction => {
  return new nodejs.NodejsFunction(scope, id, {
    functionName,
    entry,
    handler: "handler",
    runtime: lambda.Runtime.NODEJS_20_X,
    timeout,
    memorySize,
    bundling: {
      target: "node20",
      format: nodejs.OutputFormat.CJS,
    },
    environment,
  });
};

const requireExternalFargateValue = (
  enabled: boolean,
  value: string | undefined,
  name: string,
): string => {
  const normalized = value?.trim();
  if (!enabled) {
    return normalized ?? "";
  }
  if (!normalized) {
    throw new Error(`Missing required Fargate config: ${name}`);
  }
  return normalized;
};

const resolveFargateConfig = (
  scope: Construct,
  props: AppStackProps,
  assetsBucket: s3.Bucket,
): ResolvedFargateConfig => {
  if (props.envConfig.manageFargateInfra) {
    const renderInfra = createWorkflowRenderInfrastructure(scope, {
      projectPrefix: props.projectPrefix,
      assetsBucket,
    });
    return {
      clusterArn: renderInfra.cluster.clusterArn,
      taskDefinitionFamily: renderInfra.taskDefinitionFamily,
      securityGroupId: renderInfra.securityGroup.securityGroupId,
      subnetIds: renderInfra.vpc.publicSubnets.map((subnet) => subnet.subnetId),
      containerName: renderInfra.containerName,
    };
  }

  const fargateEnabled = props.envConfig.enableFargateComposition;
  const subnetIds = fargateEnabled
    ? (props.envConfig.fargateRenderSubnetIds
        ?.map((value) => value.trim())
        .filter(Boolean) ?? [])
    : (props.envConfig.fargateRenderSubnetIds ?? [])
        .map((value) => value.trim())
        .filter(Boolean);

  if (fargateEnabled && subnetIds.length === 0) {
    throw new Error("Missing required Fargate config: fargateRenderSubnetIds");
  }

  return {
    clusterArn: requireExternalFargateValue(
      fargateEnabled,
      props.envConfig.fargateRenderClusterArn,
      "fargateRenderClusterArn",
    ),
    taskDefinitionFamily:
      props.envConfig.fargateRenderTaskDefinitionFamily ??
      `${props.projectPrefix}-fargate-renderer`,
    securityGroupId: requireExternalFargateValue(
      fargateEnabled,
      props.envConfig.fargateRenderSecurityGroupId,
      "fargateRenderSecurityGroupId",
    ),
    subnetIds,
    containerName:
      props.envConfig.fargateRenderContainerName?.trim() || "renderer",
  };
};

export class AppStack extends Stack {
  public readonly assetsBucket: s3.Bucket;
  public readonly previewDistribution: cloudfront.Distribution;
  public readonly llmConfigTable: dynamodb.Table;
  public readonly jobsTable: dynamodb.Table;
  public readonly renderClusterArn: string;
  public readonly renderTaskDefinitionFamily: string;
  public readonly renderSecurityGroupId: string;
  public readonly renderSubnetIds: string[];
  public readonly renderContainerName: string;
  public readonly renderLogGroupName?: string;

  constructor(scope: Construct, id: string, props: AppStackProps) {
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

    this.assetsBucket = createAssetsBucket(this, props.projectPrefix);
    this.previewDistribution = createPreviewDistribution(
      this,
      this.assetsBucket,
    );
    this.llmConfigTable = createLlmConfigTable(this, props.projectPrefix);
    createObservabilityDashboard(this, props.projectPrefix);

    this.jobsTable = createJobsTable(this, props.projectPrefix);
    const renderConfig = resolveFargateConfig(this, props, this.assetsBucket);
    this.renderClusterArn = renderConfig.clusterArn;
    this.renderTaskDefinitionFamily = renderConfig.taskDefinitionFamily;
    this.renderSecurityGroupId = renderConfig.securityGroupId;
    this.renderSubnetIds = renderConfig.subnetIds;
    this.renderContainerName = renderConfig.containerName;

    const environment = {
      ASSETS_BUCKET_NAME: this.assetsBucket.bucketName,
      JOBS_TABLE_NAME: this.jobsTable.tableName,
      CONFIG_TABLE_NAME: this.llmConfigTable.tableName,
      BYTEPLUS_IMAGE_SECRET_ID: props.envConfig.byteplusImageSecretId ?? "",
      BYTEPLUS_VIDEO_SECRET_ID: props.envConfig.byteplusVideoSecretId ?? "",
      PEXELS_SECRET_ID: props.envConfig.pexelsSecretId ?? "",
      OPENAI_SECRET_ID: props.envConfig.openAiSecretId,
      RUNWAY_SECRET_ID: props.envConfig.runwaySecretId,
      ELEVENLABS_SECRET_ID: props.envConfig.elevenLabsSecretId,
      SHOTSTACK_SECRET_ID: props.envConfig.shotstackSecretId,
      FARGATE_RENDER_CLUSTER_ARN: this.renderClusterArn,
      FARGATE_RENDER_TASK_DEFINITION_FAMILY: this.renderTaskDefinitionFamily,
      FARGATE_RENDER_CONTAINER_NAME: this.renderContainerName,
      FARGATE_RENDER_SECURITY_GROUP_ID: this.renderSecurityGroupId,
      FARGATE_RENDER_SUBNET_IDS: this.renderSubnetIds.join(","),
      YOUTUBE_SECRETS_JSON: JSON.stringify(
        props.envConfig.youtubeSecrets ?? {},
      ),
      CHANNEL_CONFIGS_JSON: JSON.stringify(
        props.envConfig.channelConfigs ?? {},
      ),
      PREVIEW_DISTRIBUTION_DOMAIN:
        this.previewDistribution.distributionDomainName,
    };

    const pipelineHandler = createLambda(
      this,
      "AdminPipelineLambda",
      `${props.projectPrefix}-admin-pipeline`,
      path.join(process.cwd(), "services/admin/pipeline/handler.ts"),
      environment,
      Duration.minutes(15),
    );
    this.jobsTable.grantReadWriteData(pipelineHandler);
    this.assetsBucket.grantReadWrite(pipelineHandler);
    this.llmConfigTable.grantReadData(pipelineHandler);
    pipelineHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: ["*"],
      }),
    );
    pipelineHandler.addToRolePolicy(
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
          actions: ["ecs:StopTask"],
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
    grantFargateRunPermissions(pipelineHandler);

    const pipelineTriggerEnv = {
      ...environment,
      PIPELINE_WORKER_FUNCTION_NAME: pipelineHandler.functionName,
      PIPELINE_ASYNC_INVOCATION: "1",
    };

    const sceneVideoTranscriptHandler = createLambda(
      this,
      "SceneVideoTranscriptLambda",
      `${props.projectPrefix}-scene-video-transcript`,
      path.join(process.cwd(), "services/transcript/scene-video/handler.ts"),
      environment,
      Duration.minutes(15),
      1024,
    );
    this.jobsTable.grantReadWriteData(sceneVideoTranscriptHandler);
    this.assetsBucket.grantReadWrite(sceneVideoTranscriptHandler);
    sceneVideoTranscriptHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "transcribe:GetTranscriptionJob",
          "transcribe:StartTranscriptionJob",
        ],
        resources: ["*"],
      }),
    );
    grantFargateRunPermissions(sceneVideoTranscriptHandler);

    const standaloneVideoTranscriptHandler = createLambda(
      this,
      "StandaloneVideoTranscriptLambda",
      `${props.projectPrefix}-standalone-video-transcript`,
      path.join(
        process.cwd(),
        "services/transcript/standalone-video/handler.ts",
      ),
      environment,
      Duration.minutes(15),
      1024,
    );
    this.jobsTable.grantReadWriteData(standaloneVideoTranscriptHandler);
    this.assetsBucket.grantReadWrite(standaloneVideoTranscriptHandler);
    standaloneVideoTranscriptHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "transcribe:GetTranscriptionJob",
          "transcribe:StartTranscriptionJob",
        ],
        resources: ["*"],
      }),
    );
    grantFargateRunPermissions(standaloneVideoTranscriptHandler);

    const uploadTriggerEnv = {
      ...environment,
      SCENE_VIDEO_TRANSCRIPT_WORKER_FUNCTION_NAME:
        sceneVideoTranscriptHandler.functionName,
    };
    const transcriptTriggerEnv = {
      ...environment,
      STANDALONE_VIDEO_TRANSCRIPT_WORKER_FUNCTION_NAME:
        standaloneVideoTranscriptHandler.functionName,
    };

    const uploadGroupHandler = createLambda(
      this,
      "AdminUploadLambda",
      `${props.projectPrefix}-admin-upload`,
      path.join(process.cwd(), "services/publish/grouped-upload/handler.ts"),
      uploadTriggerEnv,
    );
    const transcriptsHandler = createLambda(
      this,
      "AdminTranscriptsLambda",
      `${props.projectPrefix}-admin-transcripts`,
      path.join(process.cwd(), "services/admin/transcripts/handler.ts"),
      transcriptTriggerEnv,
    );

    const jobsHandler = createLambda(
      this,
      "AdminJobsLambda",
      `${props.projectPrefix}-admin-jobs`,
      path.join(process.cwd(), "services/admin/jobs/handler.ts"),
      pipelineTriggerEnv,
    );
    const generationsHandler = createLambda(
      this,
      "AdminGenerationsLambda",
      `${props.projectPrefix}-admin-generations`,
      path.join(process.cwd(), "services/admin/generations/handler.ts"),
      pipelineTriggerEnv,
      Duration.seconds(60),
      1024,
    );
    grantFargateRunPermissions(generationsHandler);
    const contentHandler = createLambda(
      this,
      "AdminContentLambda",
      `${props.projectPrefix}-admin-content`,
      path.join(process.cwd(), "services/admin/content/handler.ts"),
      environment,
    );
    const settingsHandler = createLambda(
      this,
      "AdminSettingsLambda",
      `${props.projectPrefix}-admin-settings`,
      path.join(process.cwd(), "services/admin/settings/handler.ts"),
      environment,
    );
    const libraryHandler = createLambda(
      this,
      "AdminLibraryLambda",
      `${props.projectPrefix}-admin-library`,
      path.join(process.cwd(), "services/admin/library/handler.ts"),
      environment,
    );
    const finalHandler = createLambda(
      this,
      "AdminFinalLambda",
      `${props.projectPrefix}-admin-final`,
      path.join(process.cwd(), "services/admin/final/handler.ts"),
      {
        ...pipelineTriggerEnv,
        SHOTSTACK_SECRET_ID: props.envConfig.shotstackSecretId,
      },
    );
    grantFargateRunPermissions(finalHandler);

    const listJobsResolver = jobsHandler;
    const getJobResolver = jobsHandler;
    const jobTimelineResolver = jobsHandler;
    const jobExecutionsResolver = jobsHandler;
    const getJobDraftResolver = jobsHandler;
    const createDraftJobResolver = jobsHandler;
    const updateJobBriefResolver = jobsHandler;
    const deleteJobResolver = jobsHandler;

    const requestUploadResolver = uploadGroupHandler;
    const requestAssetUploadResolver = uploadGroupHandler;
    const completeSceneImageUploadResolver = uploadGroupHandler;
    const completeSceneVideoUploadResolver = uploadGroupHandler;
    const extractYoutubeTranscriptResolver = uploadGroupHandler;
    const requestTranscriptUploadResolver = transcriptsHandler;
    const createVideoTranscriptFromUploadResolver = transcriptsHandler;
    const createVideoTranscriptFromYoutubeResolver = transcriptsHandler;
    const getTranscriptResolver = transcriptsHandler;

    const getLlmSettingsResolver = settingsHandler;
    const updateLlmSettingsResolver = settingsHandler;
    const listContentPresetsResolver = settingsHandler;
    const deleteContentPresetResolver = settingsHandler;
    const upsertContentPresetResolver = settingsHandler;
    const pushJobRenderSettingsToContentPresetResolver = settingsHandler;
    const listVoiceProfilesResolver = settingsHandler;
    const upsertVoiceProfileResolver = settingsHandler;
    const assetPoolAssetsResolver = libraryHandler;
    const registerAssetPoolAssetResolver = libraryHandler;

    const runJobPlanResolver = generationsHandler;
    const runSceneJsonResolver = generationsHandler;
    const updateSceneJsonResolver = generationsHandler;
    const runAssetGenerationResolver = generationsHandler;
    const searchSceneStockAssetsResolver = generationsHandler;
    const selectSceneImageCandidateResolver = generationsHandler;
    const selectSceneVideoCandidateResolver = generationsHandler;
    const selectSceneVoiceCandidateResolver = generationsHandler;
    const setJobDefaultVoiceProfileResolver = generationsHandler;
    const setJobBackgroundMusicResolver = generationsHandler;
    const setSceneVoiceProfileResolver = generationsHandler;

    const runFinalCompositionResolver = finalHandler;
    const cancelFinalCompositionResolver = finalHandler;
    const selectRenderArtifactResolver = finalHandler;

    const approvePipelineExecutionResolver = pipelineHandler;

    const listContentsResolver = contentHandler;
    const createContentResolver = contentHandler;
    const deleteContentResolver = contentHandler;
    const updateContentResolver = contentHandler;
    const attachJobToContentResolver = contentHandler;

    const uploadHandler = uploadGroupHandler;

    this.assetsBucket.grantRead(uploadHandler);
    this.assetsBucket.grantRead(requestUploadResolver);
    this.jobsTable.grantReadWriteData(uploadHandler);
    this.jobsTable.grantReadWriteData(transcriptsHandler);
    this.assetsBucket.grantReadWrite(transcriptsHandler);
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
    this.jobsTable.grantReadData(listContentsResolver);
    this.jobsTable.grantReadData(listJobsResolver);
    this.jobsTable.grantReadData(getJobResolver);
    this.jobsTable.grantReadData(jobTimelineResolver);
    this.jobsTable.grantReadData(jobExecutionsResolver);
    this.jobsTable.grantReadWriteData(requestUploadResolver);
    this.jobsTable.grantReadWriteData(requestAssetUploadResolver);
    this.jobsTable.grantReadWriteData(requestTranscriptUploadResolver);
    this.jobsTable.grantReadWriteData(createVideoTranscriptFromUploadResolver);
    this.jobsTable.grantReadWriteData(createVideoTranscriptFromYoutubeResolver);
    this.jobsTable.grantReadWriteData(getTranscriptResolver);
    this.jobsTable.grantReadWriteData(completeSceneImageUploadResolver);
    this.jobsTable.grantReadWriteData(completeSceneVideoUploadResolver);
    this.jobsTable.grantReadWriteData(extractYoutubeTranscriptResolver);
    this.jobsTable.grantReadWriteData(getJobDraftResolver);
    this.jobsTable.grantReadWriteData(createDraftJobResolver);
    this.jobsTable.grantReadWriteData(updateJobBriefResolver);
    this.jobsTable.grantReadWriteData(runJobPlanResolver);
    this.jobsTable.grantReadWriteData(runSceneJsonResolver);
    this.jobsTable.grantReadWriteData(updateSceneJsonResolver);
    this.jobsTable.grantReadWriteData(runAssetGenerationResolver);
    this.jobsTable.grantReadWriteData(searchSceneStockAssetsResolver);
    this.jobsTable.grantReadWriteData(selectSceneImageCandidateResolver);
    this.jobsTable.grantReadWriteData(selectSceneVideoCandidateResolver);
    this.jobsTable.grantReadWriteData(selectSceneVoiceCandidateResolver);
    this.jobsTable.grantReadWriteData(setJobDefaultVoiceProfileResolver);
    this.jobsTable.grantReadWriteData(setJobBackgroundMusicResolver);
    this.jobsTable.grantReadWriteData(setSceneVoiceProfileResolver);
    this.jobsTable.grantReadWriteData(runFinalCompositionResolver);
    this.jobsTable.grantReadWriteData(deleteJobResolver);
    this.jobsTable.grantReadWriteData(attachJobToContentResolver);
    this.jobsTable.grantReadWriteData(approvePipelineExecutionResolver);
    this.jobsTable.grantReadWriteData(createContentResolver);
    this.jobsTable.grantReadWriteData(updateContentResolver);
    this.jobsTable.grantReadWriteData(deleteContentResolver);
    this.jobsTable.grantReadWriteData(assetPoolAssetsResolver);
    this.jobsTable.grantReadWriteData(registerAssetPoolAssetResolver);
    this.assetsBucket.grantReadWrite(getJobDraftResolver);
    this.assetsBucket.grantReadWrite(createDraftJobResolver);
    this.assetsBucket.grantReadWrite(updateJobBriefResolver);
    this.assetsBucket.grantReadWrite(runJobPlanResolver);
    this.assetsBucket.grantReadWrite(runSceneJsonResolver);
    this.assetsBucket.grantReadWrite(updateSceneJsonResolver);
    this.assetsBucket.grantReadWrite(requestAssetUploadResolver);
    this.assetsBucket.grantReadWrite(requestTranscriptUploadResolver);
    this.assetsBucket.grantReadWrite(createVideoTranscriptFromUploadResolver);
    this.assetsBucket.grantReadWrite(createVideoTranscriptFromYoutubeResolver);
    this.assetsBucket.grantReadWrite(getTranscriptResolver);
    this.assetsBucket.grantReadWrite(completeSceneVideoUploadResolver);
    this.assetsBucket.grantReadWrite(extractYoutubeTranscriptResolver);
    this.assetsBucket.grantReadWrite(runAssetGenerationResolver);
    this.assetsBucket.grantReadWrite(searchSceneStockAssetsResolver);
    this.assetsBucket.grantReadWrite(selectSceneImageCandidateResolver);
    this.assetsBucket.grantReadWrite(selectSceneVideoCandidateResolver);
    this.assetsBucket.grantReadWrite(selectSceneVoiceCandidateResolver);
    this.assetsBucket.grantReadWrite(setJobDefaultVoiceProfileResolver);
    this.assetsBucket.grantReadWrite(setJobBackgroundMusicResolver);
    this.assetsBucket.grantReadWrite(setSceneVoiceProfileResolver);
    this.assetsBucket.grantReadWrite(runFinalCompositionResolver);
    this.assetsBucket.grantReadWrite(deleteJobResolver);
    this.assetsBucket.grantReadWrite(attachJobToContentResolver);
    this.assetsBucket.grantRead(assetPoolAssetsResolver);
    this.assetsBucket.grantRead(registerAssetPoolAssetResolver);
    this.llmConfigTable.grantReadData(getLlmSettingsResolver);
    this.llmConfigTable.grantReadData(listContentPresetsResolver);
    this.llmConfigTable.grantReadWriteData(deleteContentPresetResolver);
    this.llmConfigTable.grantReadWriteData(updateLlmSettingsResolver);
    this.llmConfigTable.grantReadWriteData(upsertContentPresetResolver);
    this.llmConfigTable.grantReadData(listVoiceProfilesResolver);
    this.llmConfigTable.grantReadWriteData(upsertVoiceProfileResolver);
    this.assetsBucket.grantReadWrite(upsertVoiceProfileResolver);
    this.llmConfigTable.grantReadData(runAssetGenerationResolver);
    this.llmConfigTable.grantReadData(searchSceneStockAssetsResolver);
    this.llmConfigTable.grantReadData(setJobDefaultVoiceProfileResolver);
    this.llmConfigTable.grantReadData(setSceneVoiceProfileResolver);
    this.llmConfigTable.grantReadData(createDraftJobResolver);
    this.llmConfigTable.grantReadData(runJobPlanResolver);
    this.llmConfigTable.grantReadData(runSceneJsonResolver);
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
    searchSceneStockAssetsResolver.addToRolePolicy(
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

    pipelineHandler.grantInvoke(createDraftJobResolver);
    pipelineHandler.grantInvoke(runJobPlanResolver);
    pipelineHandler.grantInvoke(runSceneJsonResolver);
    pipelineHandler.grantInvoke(runAssetGenerationResolver);
    pipelineHandler.grantInvoke(runFinalCompositionResolver);
    sceneVideoTranscriptHandler.grantInvoke(uploadGroupHandler);
    standaloneVideoTranscriptHandler.grantInvoke(transcriptsHandler);

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
      requestTranscriptUploadResolver,
      createVideoTranscriptFromUploadResolver,
      createVideoTranscriptFromYoutubeResolver,
      completeSceneImageUploadResolver,
      completeSceneVideoUploadResolver,
      extractYoutubeTranscriptResolver,
      getTranscriptResolver,
      listContentPresetsResolver,
      deleteContentPresetResolver,
      getLlmSettingsResolver,
      updateLlmSettingsResolver,
      upsertContentPresetResolver,
      pushJobRenderSettingsToContentPresetResolver,
      listVoiceProfilesResolver,
      upsertVoiceProfileResolver,
      assetPoolAssetsResolver,
      registerAssetPoolAssetResolver,
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
      searchSceneStockAssetsResolver,
      selectSceneImageCandidateResolver,
      selectSceneVideoCandidateResolver,
      selectSceneVoiceCandidateResolver,
      setJobDefaultVoiceProfileResolver,
      setJobBackgroundMusicResolver,
      setSceneVoiceProfileResolver,
      runFinalCompositionResolver,
      cancelFinalCompositionResolver,
      selectRenderArtifactResolver,
      deleteJobResolver,
      attachJobToContentResolver,
      approvePipelineExecutionResolver,
    });

    const publishApi = createPublishApi(this, uploadHandler);

    new CfnOutput(this, "AssetsBucketName", {
      value: this.assetsBucket.bucketName,
    });
    new CfnOutput(this, "PreviewDistributionDomain", {
      value: this.previewDistribution.distributionDomainName,
    });
    new CfnOutput(this, "LlmConfigTableName", {
      value: this.llmConfigTable.tableName,
    });
    new CfnOutput(this, "JobsTableName", {
      value: this.jobsTable.tableName,
    });
    new CfnOutput(this, "RenderClusterArn", {
      value: this.renderClusterArn,
    });
    if (props.envConfig.manageFargateInfra) {
      new CfnOutput(this, "RenderLogGroupName", {
        value: `/aws/ecs/${props.projectPrefix}-fargate-renderer`,
      });
    }
    new CfnOutput(this, "PublishApiUrl", {
      value: publishApi.api.url,
    });
    new CfnOutput(this, "AdminGraphqlUrl", {
      value: adminGraphql.graphqlApi.graphqlUrl,
    });
    new CfnOutput(this, "AdminGraphqlLogGroupName", {
      value: `/aws/appsync/apis/${adminGraphql.graphqlApi.apiId}`,
    });
    new CfnOutput(this, "AdminUserPoolId", {
      value: auth.userPool.userPoolId,
    });
    new CfnOutput(this, "AdminUserPoolClientId", {
      value: auth.userPoolClient.userPoolClientId,
    });
  }
}
