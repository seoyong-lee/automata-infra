import { listPlatformConnectionsForChannel } from "../../../../shared/lib/store/platform-connections";

export const listPlatformConnectionsUsecase = async (contentId: string) => {
  const rows = await listPlatformConnectionsForChannel(contentId);
  return rows.map((c) => ({
    platformConnectionId: c.platformConnectionId,
    channelId: c.channelId,
    platform: c.platform,
    accountId: c.accountId,
    accountHandle: c.accountHandle ?? null,
    oauthAccountId: c.oauthAccountId,
    status: c.status,
    connectedAt: c.connectedAt,
    lastSyncedAt: c.lastSyncedAt ?? null,
  }));
};
