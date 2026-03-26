import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { BaseStackProps } from "./config";
import { createJobsTable } from "./modules/workflow/jobs-table";
import { createWorkflowRenderInfrastructure } from "./modules/workflow/render-infra";

export type WorkflowStackProps = StackProps &
  BaseStackProps & {
    assetsBucket: s3.Bucket;
    llmConfigTable: dynamodb.Table;
    previewDistribution: cloudfront.Distribution;
  };

export class WorkflowStack extends Stack {
  public readonly jobsTable: dynamodb.Table;
  public readonly renderClusterArn: string;
  public readonly renderTaskDefinitionFamily: string;
  public readonly renderSecurityGroupId: string;
  public readonly renderSubnetIds: string[];
  public readonly renderContainerName: string;

  constructor(scope: Construct, id: string, props: WorkflowStackProps) {
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

    this.jobsTable = createJobsTable(this, props.projectPrefix);
    const renderInfra = createWorkflowRenderInfrastructure(this, {
      projectPrefix: props.projectPrefix,
      assetsBucket: props.assetsBucket,
    });
    this.renderClusterArn = renderInfra.cluster.clusterArn;
    this.renderTaskDefinitionFamily = renderInfra.taskDefinitionFamily;
    this.renderSecurityGroupId = renderInfra.securityGroup.securityGroupId;
    this.renderSubnetIds = renderInfra.vpc.publicSubnets.map((subnet) => subnet.subnetId);
    this.renderContainerName = renderInfra.containerName;

    new CfnOutput(this, "JobsTableName", {
      value: this.jobsTable.tableName,
    });
    new CfnOutput(this, "RenderClusterArn", {
      value: this.renderClusterArn,
    });
  }
}
