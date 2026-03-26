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
    ? props.envConfig.fargateRenderSubnetIds?.map((value) => value.trim()).filter(Boolean) ?? []
    : (props.envConfig.fargateRenderSubnetIds ?? [])
        .map((value) => value.trim())
        .filter(Boolean);

  if (fargateEnabled && subnetIds.length === 0) {
    throw new Error(
      "Missing required Fargate config: fargateRenderSubnetIds",
    );
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
    this.jobsTable.grantReadWriteData(pipelineWorker);
    this.assetsBucket.grantReadWrite(pipelineWorker);
    this.llmConfigTable.grantReadData(pipelineWorker);
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

    this.assetsBucket.grantRead(uploadHandler);
    this.assetsBucket.grantRead(requestUploadResolver);
    this.jobsTable.grantReadWriteData(uploadHandler);
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
    this.jobsTable.grantReadWriteData(getJobDraftResolver);
    this.jobsTable.grantReadWriteData(createDraftJobResolver);
    this.jobsTable.grantReadWriteData(updateJobBriefResolver);
    this.jobsTable.grantReadWriteData(runJobPlanResolver);
    this.jobsTable.grantReadWriteData(runSceneJsonResolver);
    this.jobsTable.grantReadWriteData(updateSceneJsonResolver);
    this.jobsTable.grantReadWriteData(runAssetGenerationResolver);
    this.jobsTable.grantReadWriteData(selectSceneImageCandidateResolver);
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
    this.assetsBucket.grantReadWrite(getJobDraftResolver);
    this.assetsBucket.grantReadWrite(createDraftJobResolver);
    this.assetsBucket.grantReadWrite(updateJobBriefResolver);
    this.assetsBucket.grantReadWrite(runJobPlanResolver);
    this.assetsBucket.grantReadWrite(runSceneJsonResolver);
    this.assetsBucket.grantReadWrite(updateSceneJsonResolver);
    this.assetsBucket.grantReadWrite(requestAssetUploadResolver);
    this.assetsBucket.grantReadWrite(runAssetGenerationResolver);
    this.assetsBucket.grantReadWrite(selectSceneImageCandidateResolver);
    this.assetsBucket.grantReadWrite(selectSceneVoiceCandidateResolver);
    this.assetsBucket.grantReadWrite(setJobDefaultVoiceProfileResolver);
    this.assetsBucket.grantReadWrite(setJobBackgroundMusicResolver);
    this.assetsBucket.grantReadWrite(setSceneVoiceProfileResolver);
    this.assetsBucket.grantReadWrite(runFinalCompositionResolver);
    this.assetsBucket.grantReadWrite(deleteJobResolver);
    this.assetsBucket.grantReadWrite(attachJobToContentResolver);
    this.llmConfigTable.grantReadData(getLlmSettingsResolver);
    this.llmConfigTable.grantReadWriteData(updateLlmSettingsResolver);
    this.llmConfigTable.grantReadData(listVoiceProfilesResolver);
    this.llmConfigTable.grantReadWriteData(upsertVoiceProfileResolver);
    this.llmConfigTable.grantReadData(runAssetGenerationResolver);
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
