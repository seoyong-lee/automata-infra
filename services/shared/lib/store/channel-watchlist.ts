import { randomUUID } from "node:crypto";

import {
  channelWatchlistEntrySchema,
  type ChannelWatchlistEntry,
  type ChannelWatchlistSource,
  type ChannelWatchlistStatus,
  externalPlatformSchema,
} from "../../../../lib/modules/agents/contracts/agent-domain";
import { getItem, putItem, queryItems } from "../aws/runtime";
import { contentPk } from "./video-jobs";

const watchlistPk = (id: string): string => `WATCHLIST#${id}`;
const skMeta = "META" as const;
const contentSkPrefix = "WATCHLIST#";

export type ChannelWatchlistRow = ChannelWatchlistEntry & {
  PK: string;
  SK: string;
  createdAt: string;
  updatedAt: string;
};

export const createChannelWatchlistEntry = async (input: {
  contentId: string;
  platform: ChannelWatchlistEntry["platform"];
  externalChannelId: string;
  status?: ChannelWatchlistStatus;
  source?: ChannelWatchlistSource;
  priority?: number;
}): Promise<ChannelWatchlistRow> => {
  const id = `cwul_${randomUUID().replace(/-/g, "")}`;
  const now = new Date().toISOString();
  const parsed = channelWatchlistEntrySchema.parse({
    id,
    contentId: input.contentId,
    platform: externalPlatformSchema.parse(input.platform),
    externalChannelId: input.externalChannelId.trim(),
    status: input.status ?? "WATCHING",
    source: input.source ?? "MANUAL",
    priority: input.priority ?? 0,
  });
  const main: ChannelWatchlistRow = {
    ...parsed,
    PK: watchlistPk(id),
    SK: skMeta,
    createdAt: now,
    updatedAt: now,
  };
  const onContent: ChannelWatchlistRow = {
    ...main,
    PK: contentPk(input.contentId),
    SK: `${contentSkPrefix}${id}`,
  };
  await putItem(main as unknown as Record<string, unknown>);
  await putItem(onContent as unknown as Record<string, unknown>);
  return main;
};

export const getChannelWatchlistEntry = async (
  id: string,
): Promise<ChannelWatchlistRow | null> => {
  return getItem<ChannelWatchlistRow>({
    PK: watchlistPk(id),
    SK: skMeta,
  });
};

export const listChannelWatchlistForContent = async (
  contentId: string,
  limit = 100,
): Promise<ChannelWatchlistRow[]> => {
  const rows = await queryItems<ChannelWatchlistRow>({
    keyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    expressionAttributeValues: {
      ":pk": contentPk(contentId),
      ":sk": contentSkPrefix,
    },
    scanIndexForward: false,
    limit,
  });
  return rows.sort((a, b) => b.priority - a.priority);
};

export const updateChannelWatchlistEntry = async (input: {
  watchlistId: string;
  status?: ChannelWatchlistStatus;
  priority?: number;
}): Promise<ChannelWatchlistRow> => {
  const existing = await getChannelWatchlistEntry(input.watchlistId);
  if (!existing) {
    throw new Error(`watchlist entry not found: ${input.watchlistId}`);
  }
  const now = new Date().toISOString();
  const next = channelWatchlistEntrySchema.parse({
    id: existing.id,
    contentId: existing.contentId,
    platform: existing.platform,
    externalChannelId: existing.externalChannelId,
    status: input.status ?? existing.status,
    source: existing.source,
    priority: input.priority ?? existing.priority,
  });
  const main: ChannelWatchlistRow = {
    ...next,
    PK: existing.PK,
    SK: skMeta,
    createdAt: existing.createdAt,
    updatedAt: now,
  };
  const onContent: ChannelWatchlistRow = {
    ...main,
    PK: contentPk(existing.contentId),
    SK: `${contentSkPrefix}${existing.id}`,
  };
  await putItem(main as unknown as Record<string, unknown>);
  await putItem(onContent as unknown as Record<string, unknown>);
  return main;
};
