import { RemovalPolicy } from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

const GSI_COUNT = 6;

/**
 * DynamoDB allows only one GSI create or delete per table update. If the stack
 * tries to add (or drop) multiple GSIs in one deploy, CloudFormation fails with:
 * "Cannot perform more than one GSI creation or deletion in a single update".
 *
 * For an existing table, raise `videoJobsMaxGsiNumber` one step at a time and
 * deploy after each change (e.g. 5 → deploy → 6 → deploy).
 * Omit the context (default 6) once the table matches this definition.
 *
 * Example: `cdk deploy -c videoJobsMaxGsiNumber=5 ...`
 */
const parseVideoJobsMaxGsiNumber = (scope: Construct): number => {
  const raw = scope.node.tryGetContext("videoJobsMaxGsiNumber");
  if (raw === undefined || raw === null || raw === "") {
    return GSI_COUNT;
  }
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw), 10);
  if (!Number.isFinite(n)) {
    return GSI_COUNT;
  }
  return Math.min(GSI_COUNT, Math.max(1, Math.trunc(n)));
};

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

  const globalSecondaryIndexes: dynamodb.GlobalSecondaryIndexProps[] = [
    {
      indexName: "GSI1",
      partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
    },
    {
      indexName: "GSI2",
      partitionKey: { name: "GSI2PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI2SK", type: dynamodb.AttributeType.STRING },
    },
    {
      indexName: "GSI3",
      partitionKey: { name: "GSI3PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI3SK", type: dynamodb.AttributeType.STRING },
    },
    {
      indexName: "GSI4",
      partitionKey: { name: "GSI4PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI4SK", type: dynamodb.AttributeType.STRING },
    },
    /** 잡을 소속 콘텐츠(contentId)별로 조회 */
    {
      indexName: "GSI5",
      partitionKey: { name: "GSI5PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI5SK", type: dynamodb.AttributeType.STRING },
    },
    /** 등록된 콘텐츠(카탈로그) 전체 목록 */
    {
      indexName: "GSI6",
      partitionKey: { name: "GSI6PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI6SK", type: dynamodb.AttributeType.STRING },
    },
  ];

  const maxGsi = parseVideoJobsMaxGsiNumber(scope);
  for (const gsi of globalSecondaryIndexes.slice(0, maxGsi)) {
    table.addGlobalSecondaryIndex(gsi);
  }

  return table;
};
