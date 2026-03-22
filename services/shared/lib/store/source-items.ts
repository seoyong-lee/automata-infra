import { randomUUID } from "node:crypto";

import {
  sourceItemSchema,
  type SourceItem,
} from "../../../../lib/modules/publish/contracts/publish-domain";
import { getItem, putItem, queryItems } from "../aws/runtime";
import { contentPk } from "./video-jobs";

const sourcePk = (sourceId: string): string => `SOURCE#${sourceId}`;
const sourceLinkSkPrefix = "SOURCE_LINK#";

export type SourceItemRow = SourceItem & {
  PK: string;
  SK: "META";
  createdAt: string;
  updatedAt: string;
};

export type SourceChannelLinkRow = {
  PK: string;
  SK: string;
  sourceItemId: string;
  channelId: string;
  createdAt: string;
};

export const createSourceItem = async (input: {
  channelId: string;
  topic: string;
  masterHook?: string;
  sourceNotes?: string;
  status?: SourceItem["status"];
}): Promise<SourceItemRow> => {
  const id = `src_${randomUUID().replace(/-/g, "")}`;
  const now = new Date().toISOString();
  const status = input.status ?? "IDEATING";
  const parsed = sourceItemSchema.parse({
    id,
    topic: input.topic.trim(),
    masterHook: input.masterHook?.trim(),
    sourceNotes: input.sourceNotes?.trim(),
    status,
  });
  const row: SourceItemRow = {
    ...parsed,
    PK: sourcePk(id),
    SK: "META",
    createdAt: now,
    updatedAt: now,
  };
  await putItem(row as unknown as Record<string, unknown>);
  const link: SourceChannelLinkRow = {
    PK: contentPk(input.channelId),
    SK: `${sourceLinkSkPrefix}${id}`,
    sourceItemId: id,
    channelId: input.channelId,
    createdAt: now,
  };
  await putItem(link as unknown as Record<string, unknown>);
  return row;
};

export const getSourceItem = async (
  sourceItemId: string,
): Promise<SourceItemRow | null> => {
  return getItem<SourceItemRow>({
    PK: sourcePk(sourceItemId),
    SK: "META",
  });
};

export const updateSourceItem = async (input: {
  sourceItemId: string;
  topic?: string;
  masterHook?: string;
  sourceNotes?: string;
  status?: SourceItem["status"];
}): Promise<SourceItemRow> => {
  const existing = await getSourceItem(input.sourceItemId);
  if (!existing) {
    throw new Error(`source item not found: ${input.sourceItemId}`);
  }
  const now = new Date().toISOString();
  const next = sourceItemSchema.parse({
    id: existing.id,
    topic: input.topic?.trim() ?? existing.topic,
    masterHook: input.masterHook?.trim() ?? existing.masterHook,
    sourceNotes: input.sourceNotes?.trim() ?? existing.sourceNotes,
    status: input.status ?? existing.status,
  });
  const row: SourceItemRow = {
    ...next,
    PK: existing.PK,
    SK: "META",
    createdAt: existing.createdAt,
    updatedAt: now,
  };
  await putItem(row as unknown as Record<string, unknown>);
  return row;
};

export const listSourceItemIdsForChannel = async (
  channelId: string,
): Promise<string[]> => {
  const items = await queryItems<SourceChannelLinkRow>({
    keyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    expressionAttributeValues: {
      ":pk": contentPk(channelId),
      ":sk": sourceLinkSkPrefix,
    },
    scanIndexForward: false,
    limit: 200,
  });
  return items.map((i) => i.sourceItemId);
};

export const listSourceItemsForChannel = async (
  channelId: string,
): Promise<SourceItemRow[]> => {
  const ids = await listSourceItemIdsForChannel(channelId);
  const results: SourceItemRow[] = [];
  for (const id of ids) {
    const row = await getSourceItem(id);
    if (row) {
      results.push(row);
    }
  }
  return results.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
};
