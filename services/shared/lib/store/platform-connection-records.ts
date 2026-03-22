import { randomUUID } from "node:crypto";

import {
  persistedPlatformConnectionSchema,
  type PersistedPlatformConnection,
} from "../../../../lib/modules/publish/contracts/publish-domain";
import {
  deleteItemFromTable,
  getItem,
  getJobsTableName,
  putItem,
  queryItems,
} from "../aws/runtime";
import { contentPk } from "./video-jobs";

const skPrefix = "PLAT_CONN#";

export type PlatformConnectionRecordRow = PersistedPlatformConnection & {
  PK: string;
  SK: string;
  updatedAt: string;
};

export const listPersistedPlatformConnections = async (
  channelId: string,
): Promise<PlatformConnectionRecordRow[]> => {
  const items = await queryItems<PlatformConnectionRecordRow>({
    keyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    expressionAttributeValues: {
      ":pk": contentPk(channelId),
      ":sk": skPrefix,
    },
    limit: 50,
  });
  return items;
};

export const getPersistedPlatformConnection = async (
  channelId: string,
  platformConnectionId: string,
): Promise<PlatformConnectionRecordRow | null> => {
  return getItem<PlatformConnectionRecordRow>({
    PK: contentPk(channelId),
    SK: `${skPrefix}${platformConnectionId}`,
  });
};

export const upsertPersistedPlatformConnection = async (input: {
  channelId: string;
  platformConnectionId?: string;
  platform: PersistedPlatformConnection["platform"];
  accountId: string;
  accountHandle?: string;
  oauthAccountId: string;
  status: PersistedPlatformConnection["status"];
}): Promise<PlatformConnectionRecordRow> => {
  const platformConnectionId =
    input.platformConnectionId?.trim() || randomUUID();
  const now = new Date().toISOString();
  const parsed = persistedPlatformConnectionSchema.parse({
    platformConnectionId,
    channelId: input.channelId,
    platform: input.platform,
    accountId: input.accountId.trim(),
    accountHandle: input.accountHandle?.trim(),
    oauthAccountId: input.oauthAccountId.trim(),
    status: input.status,
    connectedAt: now,
    lastSyncedAt: now,
  });
  const row: PlatformConnectionRecordRow = {
    ...parsed,
    PK: contentPk(input.channelId),
    SK: `${skPrefix}${platformConnectionId}`,
    updatedAt: now,
  };
  await putItem(row as unknown as Record<string, unknown>);
  return row;
};

export const deletePersistedPlatformConnection = async (
  channelId: string,
  platformConnectionId: string,
): Promise<void> => {
  await deleteItemFromTable(getJobsTableName(), {
    PK: contentPk(channelId),
    SK: `${skPrefix}${platformConnectionId}`,
  });
};
