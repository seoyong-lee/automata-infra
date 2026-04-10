import {
  fetchAuthenticatedChannelSnapshot,
  mergeAndPushChannelMetadata,
} from "../../../../shared/lib/providers/youtube/youtube-channel-api";
import { loadYoutubeDataApiKey } from "../../../../shared/lib/providers/youtube/load-youtube-data-api-key";
import {
  getContentMeta,
  putContentMeta,
} from "../../../../shared/lib/store/video-jobs";
import { notFound } from "../../../shared/errors";
import { mapContentItemToDto } from "../../../shared/mapper/map-content-item";
import type { PushYoutubeChannelToGoogleInput } from "../../../../shared/lib/contracts/youtube-channel-publish";
import { resolveYoutubeOAuthForContent } from "../../shared/repo/resolve-youtube-oauth-for-content";

export const pushYoutubeChannelToGoogleUsecase = async (
  input: PushYoutubeChannelToGoogleInput & { actor: string },
) => {
  const { secret } = await resolveYoutubeOAuthForContent(input.contentId);
  const dataApiKey = await loadYoutubeDataApiKey();
  const content = await getContentMeta(input.contentId);
  if (!content) {
    throw notFound("content not found");
  }
  const externalChannelId =
    content.youtubeExternalChannelId ?? secret.youtube_channel_id;
  if (!externalChannelId) {
    throw new Error(
      "YouTube channel id unknown; run syncYoutubeChannelMetadata or set youtube_channel_id in the OAuth secret",
    );
  }
  await mergeAndPushChannelMetadata({
    secret,
    externalChannelId,
    title: input.title,
    description: input.description,
    channelKeywords: input.channelKeywords,
  });
  const snapshot = await fetchAuthenticatedChannelSnapshot({ secret });
  const now = new Date().toISOString();
  await putContentMeta({
    ...content,
    youtubeExternalChannelId: snapshot.externalChannelId,
    youtubeChannelTitle: snapshot.title,
    youtubeChannelDescription: snapshot.description,
    youtubeChannelCustomUrl: snapshot.customUrl,
    youtubeChannelKeywords: snapshot.keywords,
    youtubeChannelSyncedAt: snapshot.syncedAt,
    youtubeUpdatedAt: now,
    youtubeUpdatedBy: input.actor,
    updatedAt: now,
  });
  const next = await getContentMeta(input.contentId);
  if (!next) {
    throw notFound("content not found after update");
  }
  return mapContentItemToDto(next);
};
