import { removeChannelPublishConfig } from "../../../../shared/lib/store/channel-publish-config";

export const deleteYoutubeChannelConfig = async (channelId: string) => {
  await removeChannelPublishConfig(channelId);
  return {
    ok: true,
    channelId,
  };
};
