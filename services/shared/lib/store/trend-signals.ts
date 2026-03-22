import { randomUUID } from "node:crypto";

import {
  trendSignalSchema,
  type TrendSignal,
  type TrendSignalSourceKind,
} from "../../../../lib/modules/agents/contracts/agent-domain";
import { batchGetItems, getItem, putItem, queryItems } from "../aws/runtime";
import { contentPk } from "./video-jobs";

const signalPk = (id: string): string => `TREND_SIGNAL#${id}`;
const linkPrefix = "TREND_SIGNAL_LINK#";

export type TrendSignalRow = TrendSignal & {
  PK: string;
  SK: "META";
  createdAt: string;
  updatedAt: string;
};

type TrendSignalLinkRow = {
  PK: string;
  SK: string;
  trendSignalId: string;
  contentId: string;
  createdAt: string;
};

export const createTrendSignal = async (input: {
  contentId: string | null;
  sourceKind: TrendSignalSourceKind;
  rawPayload: Record<string, unknown>;
  fetchedAt: string;
  dedupeKey: string;
}): Promise<TrendSignalRow> => {
  const id = `tsig_${randomUUID().replace(/-/g, "")}`;
  const now = new Date().toISOString();
  const parsed = trendSignalSchema.parse({
    id,
    contentId: input.contentId,
    sourceKind: input.sourceKind,
    rawPayload: input.rawPayload,
    fetchedAt: input.fetchedAt,
    dedupeKey: input.dedupeKey,
  });
  const row: TrendSignalRow = {
    ...parsed,
    PK: signalPk(id),
    SK: "META",
    createdAt: now,
    updatedAt: now,
  };
  await putItem(row as unknown as Record<string, unknown>);
  if (input.contentId) {
    const link: TrendSignalLinkRow = {
      PK: contentPk(input.contentId),
      SK: `${linkPrefix}${id}`,
      trendSignalId: id,
      contentId: input.contentId,
      createdAt: now,
    };
    await putItem(link as unknown as Record<string, unknown>);
  }
  return row;
};

export const getTrendSignal = async (
  trendSignalId: string,
): Promise<TrendSignalRow | null> => {
  return getItem<TrendSignalRow>({
    PK: signalPk(trendSignalId),
    SK: "META",
  });
};

export const listTrendSignalsForChannel = async (
  channelId: string,
  limit = 50,
): Promise<TrendSignalRow[]> => {
  const links = await queryItems<TrendSignalLinkRow>({
    keyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    expressionAttributeValues: {
      ":pk": contentPk(channelId),
      ":sk": linkPrefix,
    },
    scanIndexForward: false,
    limit,
  });
  const keys = links.map((link) => ({
    PK: signalPk(link.trendSignalId),
    SK: "META" as const,
  }));
  const batch = await batchGetItems<TrendSignalRow>(keys);
  const rows = batch.filter((r): r is TrendSignalRow => r !== null);
  return rows.sort(
    (a, b) => new Date(b.fetchedAt).getTime() - new Date(a.fetchedAt).getTime(),
  );
};
