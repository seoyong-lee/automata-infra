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
  pendingReviewsResolver: lambda.IFunction;
  jobTimelineResolver: lambda.IFunction;
  jobExecutionsResolver: lambda.IFunction;
  submitReviewDecisionResolver: lambda.IFunction;
  requestUploadResolver: lambda.IFunction;
  getLlmSettingsResolver: lambda.IFunction;
  updateLlmSettingsResolver: lambda.IFunction;
  getJobDraftResolver: lambda.IFunction;
  createContentResolver: lambda.IFunction;
  updateContentResolver: lambda.IFunction;
  deleteContentResolver: lambda.IFunction;
  createDraftJobResolver: lambda.IFunction;
  updateTopicSeedResolver: lambda.IFunction;
  runTopicPlanResolver: lambda.IFunction;
  runSceneJsonResolver: lambda.IFunction;
  updateSceneJsonResolver: lambda.IFunction;
  runAssetGenerationResolver: lambda.IFunction;
  deleteJobResolver: lambda.IFunction;
  attachJobToContentResolver: lambda.IFunction;
  approvePipelineExecutionResolver: lambda.IFunction;
  channelPublishQueueResolver: lambda.IFunction;
  enqueueToChannelPublishQueueResolver: lambda.IFunction;
};

const addLambdaResolver = (
  api: appsync.GraphqlApi,
  id: string,
  fieldName: string,
  typeName: "Query" | "Mutation",
  fn: lambda.IFunction,
) => {
  const ds = api.addLambdaDataSource(`${id}Ds`, fn);
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
    "ListPendingReviews",
    "pendingReviews",
    "Query",
    props.pendingReviewsResolver,
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
    "SubmitReviewDecision",
    "submitReviewDecision",
    "Mutation",
    props.submitReviewDecisionResolver,
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
    "GetLlmSettings",
    "llmSettings",
    "Query",
    props.getLlmSettingsResolver,
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
    "UpdateTopicSeed",
    "updateTopicSeed",
    "Mutation",
    props.updateTopicSeedResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "RunTopicPlan",
    "runTopicPlan",
    "Mutation",
    props.runTopicPlanResolver,
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
