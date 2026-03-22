import { randomUUID } from "node:crypto";

import {
  platformConnectionSchema,
  type PlatformConnection,
  type PublishPlatform,
  type PublishTargetRow,
} from "../../../../lib/modules/publish/contracts/publish-domain";
import {
  listPersistedPlatformConnections,
  type PlatformConnectionRecordRow,
} from "./platform-connection-records";
import { getContentMeta, type ContentItem } from "./video-jobs";

export const syntheticYoutubePlatformConnectionId = (
  contentId: string,
): string => `pc_${contentId}_youtube`;

export const mapContentToPlatformConnections = (
  content: ContentItem,
): PlatformConnection[] => {
  const out: PlatformConnection[] = [];
  if (content.youtubeSecretName?.trim()) {
    const connectedAt =
      content.youtubeUpdatedAt?.trim() ||
      content.updatedAt ||
      new Date().toISOString();
    out.push(
      platformConnectionSchema.parse({
        platformConnectionId: syntheticYoutubePlatformConnectionId(
          content.contentId,
        ),
        channelId: content.contentId,
        platform: "YOUTUBE",
        accountId: `youtube:${content.contentId}`,
        oauthAccountId: `synthetic:${content.contentId}`,
        status: "CONNECTED",
        connectedAt,
        lastSyncedAt: content.youtubeUpdatedAt,
      }),
    );
  }
  return out;
};

const mapRecordToConnection = (
  row: PlatformConnectionRecordRow,
): PlatformConnection => {
  const { PK, SK, updatedAt, ...rest } = row;
  return platformConnectionSchema.parse(rest);
};

/**
 * Dynamo에 저장된 연결 + Content 메타에서 파생한 synthetic(YouTube)을 합친다.
 * 같은 `platform`은 **저장된 연결**이 synthetic을 덮어쓴다.
 */
export const listMergedPlatformConnectionsForChannel = async (
  channelId: string,
): Promise<PlatformConnection[]> => {
  const content = await getContentMeta(channelId);
  if (!content) {
    return [];
  }
  const synthetic = mapContentToPlatformConnections(content);
  const persisted = await listPersistedPlatformConnections(channelId);
  const byPlatform = new Map<PublishPlatform, PlatformConnection>();
  for (const s of synthetic) {
    byPlatform.set(s.platform, s);
  }
  for (const p of persisted) {
    byPlatform.set(p.platform, mapRecordToConnection(p));
  }
  return Array.from(byPlatform.values());
};

export const listPlatformConnectionsForChannel = async (
  channelId: string,
): Promise<PlatformConnection[]> => {
  return listMergedPlatformConnectionsForChannel(channelId);
};

/**
 * 출고 큐 적재 시: 연결된 매체마다 PublishTarget 1건(QUEUED).
 * `jobId`는 ChannelContentItem id와 동일하게 취급한다.
 */
export const buildDefaultPublishTargetsForJob = async (input: {
  channelId: string;
  jobId: string;
}): Promise<PublishTargetRow[]> => {
  const connections = await listMergedPlatformConnectionsForChannel(
    input.channelId,
  );
  return connections.map((c) => ({
    publishTargetId: randomUUID(),
    channelContentItemId: input.jobId,
    platformConnectionId: c.platformConnectionId,
    platform: c.platform,
    status: "QUEUED",
  }));
};
