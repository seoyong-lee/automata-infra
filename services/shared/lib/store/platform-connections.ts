import { randomUUID } from "node:crypto";

import {
  platformConnectionSchema,
  type PlatformConnection,
  type PublishTargetRow,
} from "../../../../lib/modules/publish/contracts/publish-domain";
import { getContentMeta, type ContentItem } from "./video-jobs";

export const syntheticYoutubePlatformConnectionId = (
  contentId: string,
): string => `pc_${contentId}_youtube`;

/**
 * Content 메타(채널)에서 파생 가능한 외부 매체 연결 목록.
 * YouTube는 `youtubeSecretName`이 있으면 synthetic connection 1건을 반환한다.
 * TikTok/Instagram은 필드가 생기면 동일 패턴으로 확장한다.
 */
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

export const listPlatformConnectionsForChannel = async (
  channelId: string,
): Promise<PlatformConnection[]> => {
  const content = await getContentMeta(channelId);
  if (!content) {
    return [];
  }
  return mapContentToPlatformConnections(content);
};

/**
 * 출고 큐 적재 시: 연결된 매체마다 PublishTarget 1건(QUEUED).
 * `jobId`는 문서상 ChannelContentItem id와 동일하게 취급한다(점진적 마이그레이션).
 */
export const buildDefaultPublishTargetsForJob = async (input: {
  channelId: string;
  jobId: string;
}): Promise<PublishTargetRow[]> => {
  const connections = await listPlatformConnectionsForChannel(input.channelId);
  return connections.map((c) => ({
    publishTargetId: randomUUID(),
    channelContentItemId: input.jobId,
    platformConnectionId: c.platformConnectionId,
    platform: c.platform,
    status: "QUEUED",
  }));
};
