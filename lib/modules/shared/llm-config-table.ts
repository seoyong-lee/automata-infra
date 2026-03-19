import { RemovalPolicy } from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export const createLlmConfigTable = (
  scope: Construct,
  projectPrefix: string,
): dynamodb.Table => {
  return new dynamodb.Table(scope, "LlmConfigTable", {
    tableName: `${projectPrefix}-llm-config`,
    partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
    sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    pointInTimeRecoverySpecification: {
      pointInTimeRecoveryEnabled: true,
    },
    removalPolicy: RemovalPolicy.RETAIN,
  });
};
