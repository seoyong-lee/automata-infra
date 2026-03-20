import type { YoutubeChannelConfigDto } from "../types";
import type { ChannelPublishConfigRecord } from "../../../../shared/lib/publish/channel-config";

export const mapYoutubeChannelConfigDto = (
  input: ChannelPublishConfigRecord,
): YoutubeChannelConfigDto => {
  return {
    channelId: input.channelId,
    youtubeSecretName: input.youtubeSecretName,
    youtubeAccountType: input.youtubeAccountType,
    autoPublishEnabled: input.autoPublishEnabled,
    defaultVisibility: input.defaultVisibility,
    defaultCategoryId: input.defaultCategoryId,
    playlistId: input.playlistId,
    updatedAt: input.updatedAt,
    updatedBy: input.updatedBy,
    source: input.source,
  };
};
