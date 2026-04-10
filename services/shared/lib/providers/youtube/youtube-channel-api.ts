import { YoutubeOAuthSecret, createYoutubeDataClient } from "./youtube-oauth";

export type YoutubeChannelSnapshot = {
  externalChannelId: string;
  title: string;
  description: string;
  customUrl?: string;
  keywords: string;
  syncedAt: string;
};

const readKeywords = (
  branding: { channel?: { keywords?: string | null } } | undefined,
): string => {
  const raw = branding?.channel?.keywords;
  return typeof raw === "string" ? raw : "";
};

const assertChannelIdMatchesSecret = (
  secret: YoutubeOAuthSecret,
  channelId: string,
) => {
  if (secret.youtube_channel_id && secret.youtube_channel_id !== channelId) {
    throw new Error(
      "OAuth token channel id does not match secret youtube_channel_id",
    );
  }
};

const optionalDataApiKeyParam = (
  dataApiKey: string | undefined,
): { key: string } | Record<string, never> => {
  const trimmed = dataApiKey?.trim();
  return trimmed ? { key: trimmed } : {};
};

type ThumbnailRef = { url?: string | null };

type ListedChannel = {
  snippet?: {
    title?: string | null;
    description?: string | null;
    customUrl?: string | null;
    thumbnails?: {
      default?: ThumbnailRef;
      medium?: ThumbnailRef;
      high?: ThumbnailRef;
    } | null;
  };
  brandingSettings?: { channel?: { keywords?: string | null } };
};

const mapListedChannelToSnapshot = (
  ch: ListedChannel,
  externalChannelId: string,
): YoutubeChannelSnapshot => {
  const cu = ch.snippet?.customUrl;
  const customUrl = typeof cu === "string" && cu.trim() ? cu.trim() : undefined;
  return {
    externalChannelId,
    title: ch.snippet?.title ?? "",
    description: ch.snippet?.description ?? "",
    customUrl,
    keywords: readKeywords(ch.brandingSettings),
    syncedAt: new Date().toISOString(),
  };
};

export type YoutubeChannelListItem = {
  externalChannelId: string;
  channelId: string;
  title: string;
  description: string;
  customUrl?: string;
  thumbnailUrl?: string;
};

const pickSnippetThumbnailUrl = (
  thumbnails:
    | {
        default?: ThumbnailRef;
        medium?: ThumbnailRef;
        high?: ThumbnailRef;
      }
    | null
    | undefined,
): string | undefined => {
  if (!thumbnails) {
    return undefined;
  }
  const url =
    thumbnails.high?.url ??
    thumbnails.medium?.url ??
    thumbnails.default?.url ??
    undefined;
  return typeof url === "string" && url.trim() ? url.trim() : undefined;
};

const mapChannelListRow = (
  ch: ListedChannel & { id?: string | null },
): YoutubeChannelListItem | undefined => {
  if (!ch.id) {
    return undefined;
  }
  const cu = ch.snippet?.customUrl;
  const thumbnailUrl = pickSnippetThumbnailUrl(
    ch.snippet?.thumbnails ?? undefined,
  );
  return {
    externalChannelId: ch.id,
    channelId: ch.id,
    title: ch.snippet?.title ?? "",
    description: ch.snippet?.description ?? "",
    customUrl: typeof cu === "string" && cu.trim() ? cu.trim() : undefined,
    thumbnailUrl,
  };
};

type YoutubeDataClient = ReturnType<typeof createYoutubeDataClient>;
type DataApiKeyParam = ReturnType<typeof optionalDataApiKeyParam>;

const listMineChannelsPage = async (
  youtube: YoutubeDataClient,
  keyParam: DataApiKeyParam,
  pageToken: string | undefined,
) =>
  youtube.channels.list({
    part: ["snippet"],
    mine: true,
    maxResults: 50,
    pageToken,
    ...keyParam,
  });

const appendChannelListRows = (
  items: Array<ListedChannel & { id?: string | null }> | undefined,
  out: YoutubeChannelListItem[],
) => {
  for (const ch of items ?? []) {
    const row = mapChannelListRow(ch);
    if (row) {
      out.push(row);
    }
  }
};

/**
 * `channels.list(mine:true)` — 토큰이 접근 가능한 채널 전부 (nextPageToken 순회).
 * `syncYoutubeChannelMetadata`와 달리 `youtube_channel_id` 제약을 적용하지 않는다.
 */
export const listAuthenticatedYoutubeChannels = async (input: {
  secret: YoutubeOAuthSecret;
  dataApiKey?: string;
}): Promise<YoutubeChannelListItem[]> => {
  const youtube = createYoutubeDataClient(input.secret);
  const keyParam = optionalDataApiKeyParam(input.dataApiKey);
  const out: YoutubeChannelListItem[] = [];
  let pageToken: string | undefined;
  do {
    const res = await listMineChannelsPage(youtube, keyParam, pageToken);
    appendChannelListRows(res.data.items, out);
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return out;
};

export const fetchAuthenticatedChannelSnapshot = async (input: {
  secret: YoutubeOAuthSecret;
  /** Secrets Manager `automata-studio/youtube` 등 — OAuth와 함께 `key` 쿼리로 전달 */
  dataApiKey?: string;
}): Promise<YoutubeChannelSnapshot> => {
  const youtube = createYoutubeDataClient(input.secret);
  const res = await youtube.channels.list({
    part: ["snippet", "brandingSettings", "statistics", "contentDetails"],
    mine: true,
    ...optionalDataApiKeyParam(input.dataApiKey),
  });
  const ch = res.data.items?.[0];
  if (!ch?.id) {
    throw new Error(
      "YouTube channels.list returned no channel for this OAuth token",
    );
  }
  assertChannelIdMatchesSecret(input.secret, ch.id);
  return mapListedChannelToSnapshot(ch, ch.id);
};

const assertPushHasEditableFields = (input: {
  title?: string;
  description?: string;
  channelKeywords?: string;
}): void => {
  if (
    input.title !== undefined ||
    input.description !== undefined ||
    input.channelKeywords !== undefined
  ) {
    return;
  }
  throw new Error(
    "pushYoutubeChannelToGoogle requires at least one field to update",
  );
};

type ListedChannelWithId = ListedChannel & { id: string };

type ChannelMetadataEdits = {
  title?: string;
  description?: string;
  channelKeywords?: string;
};

const buildChannelUpdateRequestBody = (
  externalChannelId: string,
  ch: ListedChannelWithId,
  edits: ChannelMetadataEdits,
) => ({
  id: externalChannelId,
  snippet: {
    title: edits.title ?? ch.snippet?.title ?? "",
    description: edits.description ?? ch.snippet?.description ?? "",
  },
  brandingSettings: {
    channel: {
      keywords: edits.channelKeywords ?? readKeywords(ch.brandingSettings),
    },
  },
});

type MergeAndPushChannelMetadataInput = {
  secret: YoutubeOAuthSecret;
  externalChannelId: string;
  title?: string;
  description?: string;
  channelKeywords?: string;
  dataApiKey?: string;
};

/**
 * `channels.update`는 snippet/branding 일부만내면 나머지가 지워질 수 있으므로,
 * 현재 값을 읽은 뒤 병합한 전체 payload로 갱신한다.
 */
export const mergeAndPushChannelMetadata = async (
  input: MergeAndPushChannelMetadataInput,
): Promise<void> => {
  assertPushHasEditableFields(input);
  assertChannelIdMatchesSecret(input.secret, input.externalChannelId);
  const youtube = createYoutubeDataClient(input.secret);
  const keyParam = optionalDataApiKeyParam(input.dataApiKey);
  const current = await youtube.channels.list({
    part: ["snippet", "brandingSettings"],
    id: [input.externalChannelId],
    ...keyParam,
  });
  const ch = current.data.items?.[0];
  if (!ch?.id) {
    throw new Error("YouTube channels.list by id returned no channel");
  }

  const channelRow: ListedChannelWithId = { ...ch, id: ch.id };

  await youtube.channels.update({
    part: ["snippet", "brandingSettings"],
    ...keyParam,
    requestBody: buildChannelUpdateRequestBody(
      input.externalChannelId,
      channelRow,
      {
        title: input.title,
        description: input.description,
        channelKeywords: input.channelKeywords,
      },
    ),
  });
};
