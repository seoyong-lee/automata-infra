import { fetchAuthenticatedChannelSnapshot } from "../../../../shared/lib/providers/youtube/youtube-channel-api";
import { loadYoutubeDataApiKey } from "../../../../shared/lib/providers/youtube/load-youtube-data-api-key";
import {
  getContentMeta,
  putContentMeta,
} from "../../../../shared/lib/store/video-jobs";
import { notFound } from "../../../shared/errors";
import { mapContentItemToDto } from "../../../shared/mapper/map-content-item";
import { resolveYoutubeOAuthForContent } from "../../shared/repo/resolve-youtube-oauth-for-content";

export const syncYoutubeChannelMetadataUsecase = async (input: {
  contentId: string;
  actor: string;
}) => {
  const { secret } = await resolveYoutubeOAuthForContent(input.contentId);
  const snapshot = await fetchAuthenticatedChannelSnapshot({ secret });
  const content = await getContentMeta(input.contentId);
  if (!content) {
    throw notFound("content not found");
  }
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
