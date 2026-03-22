import { randomUUID } from "node:crypto";

import {
  channelScoreSnapshotSchema,
  type ChannelScoreSnapshot,
} from "../../../../lib/modules/agents/contracts/agent-domain";
import { getItem, putItem, queryItems } from "../aws/runtime";
import { buildExternalChannelPartitionKey } from "./channel-signals";

const skPrefix = "SNAP#";

export type ChannelScoreSnapshotRow = ChannelScoreSnapshot & {
  PK: string;
  SK: string;
  createdAt: string;
  updatedAt: string;
};

export const putChannelScoreSnapshot = async (
  input: Omit<ChannelScoreSnapshot, "id">,
): Promise<ChannelScoreSnapshotRow> => {
  const id = `chsnap_${randomUUID().replace(/-/g, "")}`;
  const now = new Date().toISOString();
  const parsed = channelScoreSnapshotSchema.parse({
    ...input,
    id,
  });
  const pk = buildExternalChannelPartitionKey({
    platform: parsed.platform,
    externalChannelId: parsed.externalChannelId,
  });
  const row: ChannelScoreSnapshotRow = {
    ...parsed,
    PK: pk,
    SK: `${skPrefix}${now}#${id}`,
    createdAt: now,
    updatedAt: now,
  };
  await putItem(row as unknown as Record<string, unknown>);
  return row;
};

export const getLatestChannelScoreSnapshot = async (input: {
  platform: ChannelScoreSnapshot["platform"];
  externalChannelId: string;
}): Promise<ChannelScoreSnapshotRow | null> => {
  const pk = buildExternalChannelPartitionKey({
    platform: input.platform,
    externalChannelId: input.externalChannelId,
  });
  const items = await queryItems<ChannelScoreSnapshotRow>({
    keyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    expressionAttributeValues: {
      ":pk": pk,
      ":sk": skPrefix,
    },
    scanIndexForward: false,
    limit: 1,
  });
  return items[0] ?? null;
};

export const listChannelScoreSnapshotsForExternalChannel = async (input: {
  platform: ChannelScoreSnapshot["platform"];
  externalChannelId: string;
  limit?: number;
}): Promise<ChannelScoreSnapshotRow[]> => {
  const pk = buildExternalChannelPartitionKey({
    platform: input.platform,
    externalChannelId: input.externalChannelId,
  });
  return queryItems<ChannelScoreSnapshotRow>({
    keyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    expressionAttributeValues: {
      ":pk": pk,
      ":sk": skPrefix,
    },
    scanIndexForward: false,
    limit: input.limit ?? 20,
  });
};

/** 디버그/단건 조회용 */
export const getChannelScoreSnapshotByKeys = async (input: {
  pk: string;
  sk: string;
}): Promise<ChannelScoreSnapshotRow | null> => {
  return getItem<ChannelScoreSnapshotRow>({
    PK: input.pk,
    SK: input.sk,
  });
};
