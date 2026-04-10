import { getSecretJson } from "../../../../shared/lib/aws/runtime";
import {
  type YoutubeOAuthSecret,
  youtubeOAuthSecretSchema,
} from "../../../../shared/lib/providers/youtube/youtube-oauth";
import { getResolvedChannelPublishConfig } from "../../../../shared/lib/store/channel-publish-config";
import type { ChannelPublishConfigRecord } from "../../../../shared/lib/publish/channel-config";

export const resolveYoutubeOAuthForContent = async (
  contentId: string,
): Promise<{
  secret: YoutubeOAuthSecret;
  channelConfig: ChannelPublishConfigRecord | undefined;
}> => {
  const channelConfig = await getResolvedChannelPublishConfig(contentId);
  const secretName = channelConfig?.youtubeSecretName;
  if (!secretName) {
    throw new Error(`youtube secret not configured for content ${contentId}`);
  }
  const raw = await getSecretJson<unknown>(secretName);
  const secret = youtubeOAuthSecretSchema.parse(raw);
  return { secret, channelConfig };
};
