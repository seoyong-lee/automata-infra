import {
  deleteItemFromTable,
  getConfigTableName,
  getItemFromTable,
  getOptionalEnv,
  putItemToTable,
  queryItemsFromTable,
} from "../aws/runtime";
import {
  type ChannelPublishConfig,
  type ChannelPublishConfigRecord,
  getChannelPublishConfig,
  getYoutubeSecretsMap,
  listEnvChannelPublishConfigs,
} from "../publish/channel-config";
import {
  getContentMeta,
  type ContentItem,
  putContentMeta,
  listAllContentMetas,
} from "./video-jobs";

/** CONFIG_TABLE 행. 레거시는 channelId 속성만 있을 수 있음. */
type ChannelPublishConfigItem = ChannelPublishConfig & {
  PK: "CHANNEL_PUBLISH_CONFIGS";
  SK: `CHANNEL#${string}`;
  contentId?: string;
  channelId?: string;
  updatedAt: string;
  updatedBy: string;
};

const SETTINGS_PK = "CHANNEL_PUBLISH_CONFIGS";

const publishConfigSk = (contentId: string): `CHANNEL#${string}` => {
  return `CHANNEL#${contentId}`;
};

const hasConfigTable = (): boolean => {
  return Boolean(getOptionalEnv("CONFIG_TABLE_NAME"));
};

/** First non-nullish value (same semantics as `a ?? b ?? c`). */
const firstDefined = <T>(
  ...candidates: Array<T | undefined | null>
): T | undefined => {
  for (const c of candidates) {
    if (c !== undefined && c !== null) {
      return c;
    }
  }
  return undefined;
};

const resolveMergedUpdatedAt = (
  content: ContentItem,
  legacy: ChannelPublishConfigRecord | undefined,
  envPack: ReturnType<typeof getChannelPublishConfig>,
  secrets: Record<string, string>,
  contentId: string,
): string => {
  if (content.youtubeUpdatedAt) {
    return content.youtubeUpdatedAt;
  }
  if (legacy?.updatedAt) {
    return legacy.updatedAt;
  }
  if (envPack || secrets[contentId]) {
    return "1970-01-01T00:00:00.000Z";
  }
  return content.updatedAt;
};

const mapItemToRecord = (
  item: ChannelPublishConfigItem,
): ChannelPublishConfigRecord => {
  const contentId = item.contentId ?? item.channelId ?? "";
  return {
    contentId,
    youtubeSecretName: item.youtubeSecretName,
    youtubeAccountType: item.youtubeAccountType,
    autoPublishEnabled: item.autoPublishEnabled,
    defaultVisibility: item.defaultVisibility,
    defaultCategoryId: item.defaultCategoryId,
    playlistId: item.playlistId,
    updatedAt: item.updatedAt,
    updatedBy: item.updatedBy,
    source: "db",
  };
};

const buildItem = (
  input: {
    contentId: string;
    updatedAt: string;
    updatedBy: string;
  } & ChannelPublishConfig,
): ChannelPublishConfigItem => {
  return {
    PK: SETTINGS_PK,
    SK: publishConfigSk(input.contentId),
    contentId: input.contentId,
    youtubeSecretName: input.youtubeSecretName,
    youtubeAccountType: input.youtubeAccountType,
    autoPublishEnabled: input.autoPublishEnabled,
    defaultVisibility: input.defaultVisibility,
    defaultCategoryId: input.defaultCategoryId,
    playlistId: input.playlistId,
    updatedAt: input.updatedAt,
    updatedBy: input.updatedBy,
  };
};

const getChannelPublishConfigRowFromConfigTable = async (
  contentId: string,
): Promise<ChannelPublishConfigRecord | undefined> => {
  if (!hasConfigTable()) {
    return undefined;
  }
  const item = await getItemFromTable<ChannelPublishConfigItem>(
    getConfigTableName(),
    {
      PK: SETTINGS_PK,
      SK: publishConfigSk(contentId),
    },
  );
  if (!item) {
    return undefined;
  }
  return mapItemToRecord(item);
};

const mergedYoutubeIdentityFields = (
  content: ContentItem,
  legacy: ChannelPublishConfigRecord | undefined,
  envPack: ReturnType<typeof getChannelPublishConfig>,
  secrets: Record<string, string>,
  contentId: string,
): Pick<
  ChannelPublishConfigRecord,
  "youtubeSecretName" | "youtubeAccountType"
> => ({
  youtubeSecretName: firstDefined(
    content.youtubeSecretName,
    legacy?.youtubeSecretName,
    envPack?.youtubeSecretName,
    secrets[contentId],
  ),
  youtubeAccountType: firstDefined(
    content.youtubeAccountType,
    legacy?.youtubeAccountType,
    envPack?.youtubeAccountType,
  ),
});

const mergedPublishDefaultFields = (
  content: ContentItem,
  legacy: ChannelPublishConfigRecord | undefined,
  envPack: ReturnType<typeof getChannelPublishConfig>,
): Pick<
  ChannelPublishConfigRecord,
  "autoPublishEnabled" | "defaultVisibility" | "defaultCategoryId"
> => ({
  autoPublishEnabled: firstDefined(
    content.autoPublishEnabled,
    legacy?.autoPublishEnabled,
    envPack?.autoPublishEnabled,
  ),
  defaultVisibility: firstDefined(
    content.defaultVisibility,
    legacy?.defaultVisibility,
    envPack?.defaultVisibility,
  ),
  defaultCategoryId: firstDefined(
    content.defaultCategoryId,
    legacy?.defaultCategoryId,
    envPack?.defaultCategoryId,
  ),
});

const mergedPlaylistAndAuditFields = (
  content: ContentItem,
  legacy: ChannelPublishConfigRecord | undefined,
  envPack: ReturnType<typeof getChannelPublishConfig>,
  secrets: Record<string, string>,
  contentId: string,
): Pick<
  ChannelPublishConfigRecord,
  "playlistId" | "updatedAt" | "updatedBy"
> => ({
  playlistId: firstDefined(
    content.playlistId,
    legacy?.playlistId,
    envPack?.playlistId,
  ),
  updatedAt: resolveMergedUpdatedAt(
    content,
    legacy,
    envPack,
    secrets,
    contentId,
  ),
  updatedBy:
    firstDefined(content.youtubeUpdatedBy, legacy?.updatedBy) ?? "catalog",
});

function mergeContentWithFallbacks(
  content: ContentItem,
  legacy: ChannelPublishConfigRecord | undefined,
  envPack: ReturnType<typeof getChannelPublishConfig>,
): ChannelPublishConfigRecord {
  const contentId = content.contentId;
  const secrets = getYoutubeSecretsMap();
  return {
    contentId,
    ...mergedYoutubeIdentityFields(
      content,
      legacy,
      envPack,
      secrets,
      contentId,
    ),
    ...mergedPublishDefaultFields(content, legacy, envPack),
    ...mergedPlaylistAndAuditFields(
      content,
      legacy,
      envPack,
      secrets,
      contentId,
    ),
    source: "db",
  };
}

const stripYoutubeFields = (item: ContentItem): ContentItem => {
  const next = { ...item };
  delete next.youtubeSecretName;
  delete next.youtubeAccountType;
  delete next.autoPublishEnabled;
  delete next.defaultVisibility;
  delete next.defaultCategoryId;
  delete next.playlistId;
  delete next.youtubeUpdatedAt;
  delete next.youtubeUpdatedBy;
  return next;
};

export const listChannelPublishConfigs = async (): Promise<
  ChannelPublishConfigRecord[]
> => {
  const envDefaults = listEnvChannelPublishConfigs();
  const merged = new Map<string, ChannelPublishConfigRecord>(
    envDefaults.map((item) => [item.contentId, item]),
  );

  const catalog = await listAllContentMetas({ limit: 200 });
  const contentKeys = new Set(catalog.items.map((c) => c.contentId));

  let legacyRows: ChannelPublishConfigItem[] = [];
  if (hasConfigTable()) {
    legacyRows = await queryItemsFromTable<ChannelPublishConfigItem>(
      getConfigTableName(),
      {
        keyConditionExpression: "PK = :pk",
        expressionAttributeValues: {
          ":pk": SETTINGS_PK,
        },
        scanIndexForward: true,
        limit: 200,
      },
    );
    for (const row of legacyRows) {
      const rowContentId = row.contentId ?? row.channelId;
      if (rowContentId && !contentKeys.has(rowContentId)) {
        merged.set(rowContentId, mapItemToRecord(row));
      }
    }
  }

  const legacyMap = new Map<string, ChannelPublishConfigRecord>(
    legacyRows.map((r) => {
      const id = r.contentId ?? r.channelId ?? "";
      return [id, mapItemToRecord(r)];
    }),
  );

  const secrets = getYoutubeSecretsMap();
  for (const item of catalog.items) {
    const legacy = legacyMap.get(item.contentId);
    const envPack = getChannelPublishConfig(item.contentId);
    merged.set(
      item.contentId,
      mergeContentWithFallbacks(item, legacy, envPack),
    );
  }

  for (const [contentId, rec] of merged) {
    if (!rec.youtubeSecretName && secrets[contentId]) {
      merged.set(contentId, {
        ...rec,
        youtubeSecretName: secrets[contentId],
      });
    }
  }

  return Array.from(merged.values()).sort((left, right) =>
    left.contentId.localeCompare(right.contentId),
  );
};

export const getResolvedChannelPublishConfig = async (
  contentId: string,
): Promise<ChannelPublishConfigRecord | undefined> => {
  const content = await getContentMeta(contentId);
  const legacy = await getChannelPublishConfigRowFromConfigTable(contentId);
  const envPack = getChannelPublishConfig(contentId);
  const secrets = getYoutubeSecretsMap();

  if (content) {
    return mergeContentWithFallbacks(content, legacy, envPack);
  }

  if (legacy) {
    return {
      ...legacy,
      youtubeSecretName:
        legacy.youtubeSecretName ??
        envPack?.youtubeSecretName ??
        secrets[contentId],
    };
  }

  if (envPack) {
    return {
      contentId,
      ...envPack,
      youtubeSecretName: envPack.youtubeSecretName ?? secrets[contentId],
      updatedAt: "1970-01-01T00:00:00.000Z",
      updatedBy: "env",
      source: "env",
    };
  }

  if (secrets[contentId]) {
    return {
      contentId,
      youtubeSecretName: secrets[contentId],
      updatedAt: "1970-01-01T00:00:00.000Z",
      updatedBy: "env",
      source: "env",
    };
  }

  return undefined;
};

export const putChannelPublishConfig = async (
  input: {
    actor: string;
    contentId: string;
  } & ChannelPublishConfig,
): Promise<ChannelPublishConfigRecord> => {
  const updatedAt = new Date().toISOString();
  const content = await getContentMeta(input.contentId);
  if (content) {
    const next: ContentItem = {
      ...content,
      youtubeSecretName: input.youtubeSecretName,
      youtubeAccountType: input.youtubeAccountType,
      autoPublishEnabled: input.autoPublishEnabled,
      defaultVisibility: input.defaultVisibility,
      defaultCategoryId: input.defaultCategoryId,
      playlistId: input.playlistId,
      youtubeUpdatedAt: updatedAt,
      youtubeUpdatedBy: input.actor,
      updatedAt,
    };
    await putContentMeta(next);
    const legacy = await getChannelPublishConfigRowFromConfigTable(
      input.contentId,
    );
    return mergeContentWithFallbacks(
      next,
      legacy,
      getChannelPublishConfig(input.contentId),
    );
  }

  const record: ChannelPublishConfigRecord = {
    contentId: input.contentId,
    youtubeSecretName: input.youtubeSecretName,
    youtubeAccountType: input.youtubeAccountType,
    autoPublishEnabled: input.autoPublishEnabled,
    defaultVisibility: input.defaultVisibility,
    defaultCategoryId: input.defaultCategoryId,
    playlistId: input.playlistId,
    updatedAt,
    updatedBy: input.actor,
    source: "db",
  };

  if (!hasConfigTable()) {
    return record;
  }

  await putItemToTable(
    getConfigTableName(),
    buildItem({
      ...input,
      updatedAt,
      updatedBy: input.actor,
    }),
  );
  return record;
};

export const removeChannelPublishConfig = async (
  contentId: string,
): Promise<void> => {
  const content = await getContentMeta(contentId);
  if (content) {
    const cleared = stripYoutubeFields(content);
    const now = new Date().toISOString();
    await putContentMeta({ ...cleared, updatedAt: now });
  }
  if (!hasConfigTable()) {
    return;
  }
  await deleteItemFromTable(getConfigTableName(), {
    PK: SETTINGS_PK,
    SK: publishConfigSk(contentId),
  });
};
