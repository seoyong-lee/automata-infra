import { getSecretJson } from "../../../../shared/lib/aws/runtime";
import { listAuthenticatedYoutubeChannels } from "../../../../shared/lib/providers/youtube/youtube-channel-api";
import { loadYoutubeDataApiKey } from "../../../../shared/lib/providers/youtube/load-youtube-data-api-key";
import { parseYoutubeOAuthSecret } from "../../../../shared/lib/providers/youtube/youtube-oauth";
import { badUserInput } from "../../../shared/errors";

export const listYoutubeChannelsForSecretUsecase = async (input: {
  youtubeSecretName: string;
}) => {
  const raw = await getSecretJson<unknown>(input.youtubeSecretName);
  let secret;
  try {
    secret = parseYoutubeOAuthSecret(raw);
  } catch (error) {
    throw badUserInput(
      error instanceof Error ? error.message : "Invalid YouTube OAuth secret",
    );
  }
  const dataApiKey = await loadYoutubeDataApiKey();
  return listAuthenticatedYoutubeChannels({ secret, dataApiKey });
};
