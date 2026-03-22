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
  platformConnectionsResolver: lambda.IFunction;
  publishDomainResolver: lambda.IFunction;
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
  addLambdaResolver(
    graphqlApi,
    "ChannelPublishQueue",
    "channelPublishQueue",
    "Query",
    props.channelPublishQueueResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "EnqueueToChannelPublishQueue",
    "enqueueToChannelPublishQueue",
    "Mutation",
    props.enqueueToChannelPublishQueueResolver,
  );
  addLambdaResolver(
    graphqlApi,
    "PlatformConnections",
    "platformConnections",
    "Query",
    props.platformConnectionsResolver,
  );
  const publishDomain = props.publishDomainResolver;
  addLambdaResolver(
    graphqlApi,
    "SourceItem",
    "sourceItem",
    "Query",
    publishDomain,
  );
  addLambdaResolver(
    graphqlApi,
    "SourceItemsForChannel",
    "sourceItemsForChannel",
    "Query",
    publishDomain,
  );
  addLambdaResolver(
    graphqlApi,
    "PlatformPublishProfileQuery",
    "platformPublishProfile",
    "Query",
    publishDomain,
  );
  addLambdaResolver(
    graphqlApi,
    "ContentPublishDraftQuery",
    "contentPublishDraft",
    "Query",
    publishDomain,
  );
  addLambdaResolver(
    graphqlApi,
    "PublishTargetsForJob",
    "publishTargetsForJob",
    "Query",
    publishDomain,
  );
  addLambdaResolver(
    graphqlApi,
    "IdeaCandidatesForChannel",
    "ideaCandidatesForChannel",
    "Query",
    publishDomain,
  );
  addLambdaResolver(
    graphqlApi,
    "TrendSignalsForChannel",
    "trendSignalsForChannel",
    "Query",
    publishDomain,
  );
  addLambdaResolver(
    graphqlApi,
    "AgentRunsForChannel",
    "agentRunsForChannel",
    "Query",
    publishDomain,
  );
  addLambdaResolver(
    graphqlApi,
    "PerformanceInsightsForJob",
    "performanceInsightsForJob",
    "Query",
    publishDomain,
  );
  addLambdaResolver(
    graphqlApi,
    "ChannelAgentConfig",
    "channelAgentConfig",
    "Query",
    publishDomain,
  );
  addLambdaResolver(
    graphqlApi,
    "ChannelWatchlist",
    "channelWatchlist",
    "Query",
    publishDomain,
  );
  addLambdaResolver(
    graphqlApi,
    "LatestChannelScoreSnapshotsForChannel",
    "latestChannelScoreSnapshotsForChannel",
    "Query",
    publishDomain,
  );
  addLambdaResolver(
    graphqlApi,
    "CreateSourceItem",
    "createSourceItem",
    "Mutation",
    publishDomain,
  );
  addLambdaResolver(
    graphqlApi,
    "UpdateSourceItem",
    "updateSourceItem",
    "Mutation",
    publishDomain,
  );
  addLambdaResolver(
    graphqlApi,
    "SetJobSourceItem",
    "setJobSourceItem",
    "Mutation",
    publishDomain,
  );
  addLambdaResolver(
    graphqlApi,
    "UpsertPlatformConnection",
    "upsertPlatformConnection",
    "Mutation",
    publishDomain,
  );
  addLambdaResolver(
    graphqlApi,
    "UpdatePlatformPublishProfile",
    "updatePlatformPublishProfile",
    "Mutation",
    publishDomain,
  );
  addLambdaResolver(
    graphqlApi,
    "UpdateContentPublishDraft",
    "updateContentPublishDraft",
    "Mutation",
    publishDomain,
  );
  addLambdaResolver(
    graphqlApi,
    "RunPublishOrchestration",
    "runPublishOrchestration",
    "Mutation",
    publishDomain,
  );
  addLambdaResolver(
    graphqlApi,
    "PromoteIdeaCandidateToSource",
    "promoteIdeaCandidateToSource",
    "Mutation",
    publishDomain,
  );
  addLambdaResolver(
    graphqlApi,
    "RejectIdeaCandidate",
    "rejectIdeaCandidate",
    "Mutation",
    publishDomain,
  );
  addLambdaResolver(
    graphqlApi,
    "UpdateChannelAgentConfig",
    "updateChannelAgentConfig",
    "Mutation",
    publishDomain,
  );
  addLambdaResolver(
    graphqlApi,
    "CreateChannelWatchlistEntry",
    "createChannelWatchlistEntry",
    "Mutation",
    publishDomain,
  );
  addLambdaResolver(
    graphqlApi,
    "UpdateChannelWatchlistEntry",
    "updateChannelWatchlistEntry",
    "Mutation",
    publishDomain,
  );
  addLambdaResolver(
    graphqlApi,
    "EnqueueTrendScoutJob",
    "enqueueTrendScoutJob",
    "Mutation",
    publishDomain,
  );

  return {
    graphqlApi,
  };
};
