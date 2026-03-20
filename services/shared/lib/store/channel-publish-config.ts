import {
  deleteItemFromTable,
  getConfigTableName,
  getOptionalEnv,
  putItemToTable,
  queryItemsFromTable,
} from "../aws/runtime";
import {
  type ChannelPublishConfig,
  type ChannelPublishConfigRecord,
  getChannelPublishConfig,
  listEnvChannelPublishConfigs,
} from "../publish/channel-config";

type ChannelPublishConfigItem = ChannelPublishConfig & {
  PK: "CHANNEL_PUBLISH_CONFIGS";
  SK: `CHANNEL#${string}`;
  channelId: string;
  updatedAt: string;
  updatedBy: string;
};

const SETTINGS_PK = "CHANNEL_PUBLISH_CONFIGS";

const channelSk = (channelId: string): `CHANNEL#${string}` => {
  return `CHANNEL#${channelId}`;
};

const hasConfigTable = (): boolean => {
  return Boolean(getOptionalEnv("CONFIG_TABLE_NAME"));
};

const mapItemToRecord = (
  item: ChannelPublishConfigItem,
): ChannelPublishConfigRecord => {
  return {
    channelId: item.channelId,
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
    channelId: string;
    updatedAt: string;
    updatedBy: string;
  } & ChannelPublishConfig,
): ChannelPublishConfigItem => {
  return {
    PK: SETTINGS_PK,
    SK: channelSk(input.channelId),
    channelId: input.channelId,
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

export const listChannelPublishConfigs = async (): Promise<
  ChannelPublishConfigRecord[]
> => {
  const envDefaults = listEnvChannelPublishConfigs();
  if (!hasConfigTable()) {
    return envDefaults;
  }

  const items = await queryItemsFromTable<ChannelPublishConfigItem>(
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

  const records = new Map<string, ChannelPublishConfigRecord>(
    envDefaults.map((item) => [item.channelId, item]),
  );
  for (const item of items) {
    records.set(item.channelId, mapItemToRecord(item));
  }

  return Array.from(records.values()).sort((left, right) =>
    left.channelId.localeCompare(right.channelId),
  );
};

export const getChannelPublishConfigRecord = async (
  channelId: string,
): Promise<ChannelPublishConfigRecord | undefined> => {
  const items = await listChannelPublishConfigs();
  return items.find((item) => item.channelId === channelId);
};

export const getResolvedChannelPublishConfig = async (
  channelId: string,
): Promise<ChannelPublishConfigRecord | undefined> => {
  const stored = await getChannelPublishConfigRecord(channelId);
  if (stored) {
    return stored;
  }
  const envConfig = getChannelPublishConfig(channelId);
  if (!envConfig) {
    return undefined;
  }
  return {
    channelId,
    ...envConfig,
    updatedAt: "1970-01-01T00:00:00.000Z",
    updatedBy: "env",
    source: "env",
  };
};

export const putChannelPublishConfig = async (
  input: {
    actor: string;
    channelId: string;
  } & ChannelPublishConfig,
): Promise<ChannelPublishConfigRecord> => {
  const updatedAt = new Date().toISOString();
  const record: ChannelPublishConfigRecord = {
    channelId: input.channelId,
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
  channelId: string,
): Promise<void> => {
  if (!hasConfigTable()) {
    return;
  }
  await deleteItemFromTable(getConfigTableName(), {
    PK: SETTINGS_PK,
    SK: channelSk(channelId),
  });
};
