import { randomUUID } from "node:crypto";

import {
  performanceInsightSchema,
  type PerformanceInsight,
  type PerformanceSnapshotKind,
} from "../../../../lib/modules/agents/contracts/agent-domain";
import { getItem, putItem, queryItems } from "../aws/runtime";
import { jobPk } from "./video-jobs";

const skPrefix = "PERF_INSIGHT#";

export type PerformanceInsightRow = PerformanceInsight & {
  PK: string;
  SK: string;
  createdAt: string;
  updatedAt: string;
};

export const putPerformanceInsight = async (input: {
  jobId: string;
  publishTargetId?: string;
  snapshotKind: PerformanceSnapshotKind;
  metrics: Record<string, unknown>;
  diagnosis?: string;
  suggestedActions: string[];
  relatedSourceItemId?: string;
}): Promise<PerformanceInsightRow> => {
  const id = `perf_${randomUUID().replace(/-/g, "")}`;
  const now = new Date().toISOString();
  const parsed = performanceInsightSchema.parse({
    id,
    jobId: input.jobId,
    publishTargetId: input.publishTargetId,
    snapshotKind: input.snapshotKind,
    metrics: input.metrics,
    diagnosis: input.diagnosis,
    suggestedActions: input.suggestedActions,
    relatedSourceItemId: input.relatedSourceItemId,
  });
  const row: PerformanceInsightRow = {
    ...parsed,
    PK: jobPk(input.jobId),
    SK: `${skPrefix}${input.snapshotKind}#${id}`,
    createdAt: now,
    updatedAt: now,
  };
  await putItem(row as unknown as Record<string, unknown>);
  return row;
};

export const listPerformanceInsightsForJob = async (
  jobId: string,
  limit = 20,
): Promise<PerformanceInsightRow[]> => {
  const items = await queryItems<PerformanceInsightRow>({
    keyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    expressionAttributeValues: {
      ":pk": jobPk(jobId),
      ":sk": skPrefix,
    },
    scanIndexForward: false,
    limit,
  });
  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
};

export const getPerformanceInsight = async (
  jobId: string,
  sk: string,
): Promise<PerformanceInsightRow | null> => {
  return getItem<PerformanceInsightRow>({
    PK: jobPk(jobId),
    SK: sk,
  });
};
