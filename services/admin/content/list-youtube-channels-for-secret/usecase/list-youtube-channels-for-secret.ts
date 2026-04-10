import { getSecretJson } from "../../../../shared/lib/aws/runtime";
import { listAuthenticatedYoutubeChannels } from "../../../../shared/lib/providers/youtube/youtube-channel-api";
import { loadYoutubeDataApiKey } from "../../../../shared/lib/providers/youtube/load-youtube-data-api-key";
import { youtubeOAuthSecretSchema } from "../../../../shared/lib/providers/youtube/youtube-oauth";

export const listYoutubeChannelsForSecretUsecase = async (input: {
  youtubeSecretName: string;
}) => {
  const raw = await getSecretJson<unknown>(input.youtubeSecretName);
  const secret = youtubeOAuthSecretSchema.parse(raw);
  const dataApiKey = await loadYoutubeDataApiKey();
  return listAuthenticatedYoutubeChannels({ secret, dataApiKey });
};
