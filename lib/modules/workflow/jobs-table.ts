import { RemovalPolicy } from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export const createJobsTable = (
  scope: Construct,
  projectPrefix: string,
): dynamodb.Table => {
  const table = new dynamodb.Table(scope, "VideoJobsTable", {
    tableName: `${projectPrefix}-jobs`,
    partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
    sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    pointInTimeRecoverySpecification: {
      pointInTimeRecoveryEnabled: true,
    },
    removalPolicy: RemovalPolicy.RETAIN,
  });

  table.addGlobalSecondaryIndex({
    indexName: "GSI1",
    partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
    sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
  });

  table.addGlobalSecondaryIndex({
    indexName: "GSI2",
    partitionKey: { name: "GSI2PK", type: dynamodb.AttributeType.STRING },
    sortKey: { name: "GSI2SK", type: dynamodb.AttributeType.STRING },
  });

  table.addGlobalSecondaryIndex({
    indexName: "GSI3",
    partitionKey: { name: "GSI3PK", type: dynamodb.AttributeType.STRING },
    sortKey: { name: "GSI3SK", type: dynamodb.AttributeType.STRING },
  });

  return table;
};
