import {
  platformPublishProfileSchema,
  type PlatformPublishProfile,
} from "../../../../lib/modules/publish/contracts/publish-domain";
import { getItem, putItem } from "../aws/runtime";
import { contentPk } from "./video-jobs";

const skPrefix = "PUBLISH_PROFILE#";

export type PublishProfileRow = PlatformPublishProfile & {
  PK: string;
  SK: string;
  updatedAt: string;
};

export const getPlatformPublishProfile = async (
  channelId: string,
  platformConnectionId: string,
): Promise<PlatformPublishProfile | null> => {
  const row = await getItem<PublishProfileRow>({
    PK: contentPk(channelId),
    SK: `${skPrefix}${platformConnectionId}`,
  });
  if (!row) {
    return null;
  }
  const { PK, SK, updatedAt, ...rest } = row;
  return platformPublishProfileSchema.parse(rest as Record<string, unknown>);
};

export const putPlatformPublishProfile = async (
  profile: PlatformPublishProfile,
): Promise<PlatformPublishProfile> => {
  const parsed = platformPublishProfileSchema.parse(profile);
  const now = new Date().toISOString();
  const row: PublishProfileRow = {
    ...parsed,
    PK: contentPk(parsed.channelId),
    SK: `${skPrefix}${parsed.platformConnectionId}`,
    updatedAt: now,
  };
  await putItem(row as unknown as Record<string, unknown>);
  return parsed;
};
