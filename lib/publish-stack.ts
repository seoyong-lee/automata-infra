import * as path from "path";
import { CfnOutput, Duration, Stack, StackProps } from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
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
      REVIEW_QUEUE_URL: props.reviewQueue.queueUrl,
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

    props.assetsBucket.grantReadWrite(reviewHandler);
    props.assetsBucket.grantReadWrite(uploadHandler);
    props.assetsBucket.grantRead(metricsCollector);
    props.jobsTable.grantReadWriteData(reviewHandler);
    props.jobsTable.grantReadWriteData(uploadHandler);
    props.jobsTable.grantReadData(metricsCollector);
    props.reviewQueue.grantConsumeMessages(reviewHandler);
    props.stateMachine.grantTaskResponse(reviewHandler);
    props.jobsTable.grantReadData(listJobsResolver);
    props.jobsTable.grantReadData(getJobResolver);
    props.jobsTable.grantReadData(pendingReviewsResolver);
    props.jobsTable.grantReadData(jobTimelineResolver);
    props.jobsTable.grantReadWriteData(submitReviewDecisionResolver);
    props.jobsTable.grantReadWriteData(requestUploadResolver);
    props.stateMachine.grantTaskResponse(submitReviewDecisionResolver);

    const auth = createPublishAuth(this, {
      projectPrefix: props.projectPrefix,
      domainPrefix:
        props.envConfig.adminUserPoolDomainPrefix ??
        `${props.projectPrefix}-admin-auth`,
      enableSignup: props.envConfig.enableAdminSignup ?? false,
      reviewUiDomain: props.envConfig.reviewUiDomain,
      googleOAuthSecretId: props.envConfig.googleOAuthSecretId,
    });

    const adminGraphql = createPublishGraphqlApi(this, {
      projectPrefix: props.projectPrefix,
      userPool: auth.userPool,
      listJobsResolver,
      getJobResolver,
      pendingReviewsResolver,
      jobTimelineResolver,
      submitReviewDecisionResolver,
      requestUploadResolver,
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
