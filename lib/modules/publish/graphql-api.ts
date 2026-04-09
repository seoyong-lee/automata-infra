import * as path from "path";
import * as appsync from "aws-cdk-lib/aws-appsync";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export type PublishGraphqlResources = {
  graphqlApi: appsync.GraphqlApi;
};

type CreatePublishGraphqlApiProps = {
  projectPrefix: string;
  userPool: import("aws-cdk-lib/aws-cognito").IUserPool;
  listContentsResolver: lambda.IFunction;
  listJobsResolver: lambda.IFunction;
  getJobResolver: lambda.IFunction;
  jobTimelineResolver: lambda.IFunction;
  jobExecutionsResolver: lambda.IFunction;
  requestUploadResolver: lambda.IFunction;
  requestAssetUploadResolver: lambda.IFunction;
  requestTranscriptUploadResolver: lambda.IFunction;
  createVideoTranscriptFromUploadResolver: lambda.IFunction;
  createVideoTranscriptFromYoutubeResolver: lambda.IFunction;
  completeSceneImageUploadResolver: lambda.IFunction;
  completeSceneVideoUploadResolver: lambda.IFunction;
  extractYoutubeTranscriptResolver: lambda.IFunction;
  getTranscriptResolver: lambda.IFunction;
  listContentPresetsResolver: lambda.IFunction;
  deleteContentPresetResolver: lambda.IFunction;
  getLlmSettingsResolver: lambda.IFunction;
  updateLlmSettingsResolver: lambda.IFunction;
  upsertContentPresetResolver: lambda.IFunction;
  pushJobRenderSettingsToContentPresetResolver: lambda.IFunction;
  listVoiceProfilesResolver: lambda.IFunction;
  upsertVoiceProfileResolver: lambda.IFunction;
  assetPoolAssetsResolver: lambda.IFunction;
  registerAssetPoolAssetResolver: lambda.IFunction;
  getJobDraftResolver: lambda.IFunction;
  createContentResolver: lambda.IFunction;
  updateContentResolver: lambda.IFunction;
  deleteContentResolver: lambda.IFunction;
  createDraftJobResolver: lambda.IFunction;
  updateJobBriefResolver: lambda.IFunction;
  runJobPlanResolver: lambda.IFunction;
  runSceneJsonResolver: lambda.IFunction;
  updateSceneJsonResolver: lambda.IFunction;
  runAssetGenerationResolver: lambda.IFunction;
  searchSceneStockAssetsResolver: lambda.IFunction;
  selectSceneImageCandidateResolver: lambda.IFunction;
  selectSceneVideoCandidateResolver: lambda.IFunction;
  selectSceneVoiceCandidateResolver: lambda.IFunction;
  setJobDefaultVoiceProfileResolver: lambda.IFunction;
  setJobBackgroundMusicResolver: lambda.IFunction;
  setSceneVoiceProfileResolver: lambda.IFunction;
  runFinalCompositionResolver: lambda.IFunction;
  cancelFinalCompositionResolver: lambda.IFunction;
  selectRenderArtifactResolver: lambda.IFunction;
  deleteJobResolver: lambda.IFunction;
  attachJobToContentResolver: lambda.IFunction;
  approvePipelineExecutionResolver: lambda.IFunction;
};

const addLambdaResolver = (
  api: appsync.GraphqlApi,
  id: string,
  fieldName: string,
  typeName: "Query" | "Mutation",
  fn: lambda.IFunction,
) => {
  const ds = api.addLambdaDataSource(`${id}Ds`, fn);
  fn.grantInvoke(ds.grantPrincipal);
  ds.createResolver(`${id}Resolver`, {
    typeName,
    fieldName,
  });
};

export const createPublishGraphqlApi = (
  scope: Construct,
  props: CreatePublishGraphqlApiProps,
): PublishGraphqlResources => {
  const graphqlApi = new appsync.GraphqlApi(scope, "AdminGraphqlApi", {
    name: `${props.projectPrefix}-admin-api`,
    definition: appsync.Definition.fromFile(
      path.join(process.cwd(), "lib/modules/publish/graphql/schema.graphql"),
    ),
    authorizationConfig: {
      defaultAuthorization: {
        authorizationType: appsync.AuthorizationType.USER_POOL,
        userPoolConfig: {
          userPool: props.userPool,
        },
      },
    },
    xrayEnabled: true,
    logConfig: {
      fieldLogLevel: appsync.FieldLogLevel.ERROR,
    },
  });

  addLambdaResolver(
    graphqlApi,
    "ListAdminContents",
    "adminContents",
    "Query",
    props.listContentsResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "ListAdminJobs",
    "adminJobs",
    "Query",
    props.listJobsResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "GetAdminJob",
    "adminJob",
    "Query",
    props.getJobResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "JobTimeline",
    "jobTimeline",
    "Query",
    props.jobTimelineResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "JobExecutions",
    "jobExecutions",
    "Query",
    props.jobExecutionsResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "GetJobDraft",
    "jobDraft",
    "Query",
    props.getJobDraftResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "RequestUpload",
    "requestUpload",
    "Mutation",
    props.requestUploadResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "RequestAssetUpload",
    "requestAssetUpload",
    "Mutation",
    props.requestAssetUploadResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "RequestTranscriptUpload",
    "requestTranscriptUpload",
    "Mutation",
    props.requestTranscriptUploadResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "CreateVideoTranscriptFromUpload",
    "createVideoTranscriptFromUpload",
    "Mutation",
    props.createVideoTranscriptFromUploadResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "CreateVideoTranscriptFromYoutube",
    "createVideoTranscriptFromYoutube",
    "Mutation",
    props.createVideoTranscriptFromYoutubeResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "CompleteSceneImageUpload",
    "completeSceneImageUpload",
    "Mutation",
    props.completeSceneImageUploadResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "CompleteSceneVideoUpload",
    "completeSceneVideoUpload",
    "Mutation",
    props.completeSceneVideoUploadResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "ExtractYoutubeTranscript",
    "extractYoutubeTranscript",
    "Mutation",
    props.extractYoutubeTranscriptResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "ListContentPresets",
    "contentPresets",
    "Query",
    props.listContentPresetsResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "GetLlmSettings",
    "llmSettings",
    "Query",
    props.getLlmSettingsResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "ListVoiceProfiles",
    "voiceProfiles",
    "Query",
    props.listVoiceProfilesResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "AssetPoolAssets",
    "assetPoolAssets",
    "Query",
    props.assetPoolAssetsResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "GetTranscript",
    "getTranscript",
    "Query",
    props.getTranscriptResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "UpdateLlmStepSettings",
    "updateLlmStepSettings",
    "Mutation",
    props.updateLlmSettingsResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "DeleteContentPreset",
    "deleteContentPreset",
    "Mutation",
    props.deleteContentPresetResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "UpsertContentPreset",
    "upsertContentPreset",
    "Mutation",
    props.upsertContentPresetResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "PushJobRenderSettingsToContentPreset",
    "pushJobRenderSettingsToContentPreset",
    "Mutation",
    props.pushJobRenderSettingsToContentPresetResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "UpsertVoiceProfile",
    "upsertVoiceProfile",
    "Mutation",
    props.upsertVoiceProfileResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "RegisterAssetPoolAsset",
    "registerAssetPoolAsset",
    "Mutation",
    props.registerAssetPoolAssetResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "CreateContent",
    "createContent",
    "Mutation",
    props.createContentResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "UpdateContent",
    "updateContent",
    "Mutation",
    props.updateContentResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "DeleteContent",
    "deleteContent",
    "Mutation",
    props.deleteContentResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "CreateDraftJob",
    "createDraftJob",
    "Mutation",
    props.createDraftJobResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "UpdateJobBrief",
    "updateJobBrief",
    "Mutation",
    props.updateJobBriefResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "RunJobPlan",
    "runJobPlan",
    "Mutation",
    props.runJobPlanResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "RunSceneJson",
    "runSceneJson",
    "Mutation",
    props.runSceneJsonResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "UpdateSceneJson",
    "updateSceneJson",
    "Mutation",
    props.updateSceneJsonResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "RunAssetGeneration",
    "runAssetGeneration",
    "Mutation",
    props.runAssetGenerationResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "SearchSceneStockAssets",
    "searchSceneStockAssets",
    "Mutation",
    props.searchSceneStockAssetsResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "SelectSceneImageCandidate",
    "selectSceneImageCandidate",
    "Mutation",
    props.selectSceneImageCandidateResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "SelectSceneVideoCandidate",
    "selectSceneVideoCandidate",
    "Mutation",
    props.selectSceneVideoCandidateResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "SelectSceneVoiceCandidate",
    "selectSceneVoiceCandidate",
    "Mutation",
    props.selectSceneVoiceCandidateResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "SetJobDefaultVoiceProfile",
    "setJobDefaultVoiceProfile",
    "Mutation",
    props.setJobDefaultVoiceProfileResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "SetJobBackgroundMusic",
    "setJobBackgroundMusic",
    "Mutation",
    props.setJobBackgroundMusicResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "SetSceneVoiceProfile",
    "setSceneVoiceProfile",
    "Mutation",
    props.setSceneVoiceProfileResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "RunFinalComposition",
    "runFinalComposition",
    "Mutation",
    props.runFinalCompositionResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "CancelFinalComposition",
    "cancelFinalComposition",
    "Mutation",
    props.cancelFinalCompositionResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "SelectRenderArtifact",
    "selectRenderArtifact",
    "Mutation",
    props.selectRenderArtifactResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "DeleteJob",
    "deleteJob",
    "Mutation",
    props.deleteJobResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "AttachJobToContent",
    "attachJobToContent",
    "Mutation",
    props.attachJobToContentResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "ApprovePipelineExecution",
    "approvePipelineExecution",
    "Mutation",
    props.approvePipelineExecutionResolver,
  );

  return {
    graphqlApi,
  };
};
