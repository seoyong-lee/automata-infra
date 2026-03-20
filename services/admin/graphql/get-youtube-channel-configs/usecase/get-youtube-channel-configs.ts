import type { YoutubeChannelConfigListDto } from "../../shared/types";
import { mapYoutubeChannelConfigDto } from "../../shared/mapper/map-youtube-channel-config";
import { listChannelPublishConfigs } from "../../../../shared/lib/store/channel-publish-config";

export const getYoutubeChannelConfigs =
  async (): Promise<YoutubeChannelConfigListDto> => {
    const items = await listChannelPublishConfigs();
    return {
      items: items.map(mapYoutubeChannelConfigDto),
    };
  };
