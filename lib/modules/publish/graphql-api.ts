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
  getLlmSettingsResolver: lambda.IFunction;
  updateLlmSettingsResolver: lambda.IFunction;
  listVoiceProfilesResolver: lambda.IFunction;
  upsertVoiceProfileResolver: lambda.IFunction;
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
  selectSceneImageCandidateResolver: lambda.IFunction;
  selectSceneVoiceCandidateResolver: lambda.IFunction;
  setJobDefaultVoiceProfileResolver: lambda.IFunction;
  setJobBackgroundMusicResolver: lambda.IFunction;
  setSceneVoiceProfileResolver: lambda.IFunction;
  runFinalCompositionResolver: lambda.IFunction;
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
    "UpdateLlmStepSettings",
    "updateLlmStepSettings",
    "Mutation",
    props.updateLlmSettingsResolver,
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
    "SelectSceneImageCandidate",
    "selectSceneImageCandidate",
    "Mutation",
    props.selectSceneImageCandidateResolver,
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
