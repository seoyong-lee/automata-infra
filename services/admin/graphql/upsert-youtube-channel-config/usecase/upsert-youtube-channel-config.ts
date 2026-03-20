import type { YoutubeChannelConfigDto } from "../../shared/types";
import { mapYoutubeChannelConfigDto } from "../../shared/mapper/map-youtube-channel-config";
import { putChannelPublishConfig } from "../../../../shared/lib/store/channel-publish-config";

export const upsertYoutubeChannelConfig = async (input: {
  actor: string;
  channelId: string;
  youtubeSecretName: string;
  youtubeAccountType?: string;
  autoPublishEnabled?: boolean;
  defaultVisibility?: "private" | "unlisted" | "public";
  defaultCategoryId?: number;
  playlistId?: string;
}): Promise<YoutubeChannelConfigDto> => {
  const record = await putChannelPublishConfig(input);
  return mapYoutubeChannelConfigDto(record);
};
