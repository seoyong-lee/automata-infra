import { z } from "zod";

const visibilitySchema = z.enum(["private", "unlisted", "public"]);

const youtubeSecretsMapSchema = z.record(z.string(), z.string());

const channelConfigSchema = z
  .object({
    youtubeSecretName: z.string().trim().min(1).optional(),
    youtubeAccountType: z.string().trim().min(1).optional(),
    autoPublishEnabled: z.boolean().optional(),
    defaultVisibility: visibilitySchema.optional(),
    defaultCategoryId: z.number().int().positive().optional(),
    playlistId: z.string().trim().min(1).optional(),
  })
  .strict();

const channelConfigsSchema = z.record(z.string(), channelConfigSchema);

export type ChannelPublishConfig = z.infer<typeof channelConfigSchema>;
export type UploadVisibility = z.infer<typeof visibilitySchema>;

const parseJsonEnv = <T>(
  rawValue: string | undefined,
  schema: z.ZodType<T>,
  fallback: T,
): T => {
  if (!rawValue?.trim()) {
    return fallback;
  }
  try {
    return schema.parse(JSON.parse(rawValue));
  } catch {
    return fallback;
  }
};

export const getYoutubeSecretsMap = (): Record<string, string> => {
  return parseJsonEnv(
    process.env.YOUTUBE_SECRETS_JSON,
    youtubeSecretsMapSchema,
    {},
  );
};

export const getChannelConfigsMap = (): Record<
  string,
  ChannelPublishConfig
> => {
  return parseJsonEnv(
    process.env.CHANNEL_CONFIGS_JSON,
    channelConfigsSchema,
    {},
  );
};

export const getChannelPublishConfig = (
  channelId: string,
): (ChannelPublishConfig & { youtubeSecretName?: string }) | undefined => {
  const channelConfigs = getChannelConfigsMap();
  const youtubeSecrets = getYoutubeSecretsMap();
  const channelConfig = channelConfigs[channelId];
  const youtubeSecretName =
    channelConfig?.youtubeSecretName ?? youtubeSecrets[channelId];

  if (!channelConfig && !youtubeSecretName) {
    return undefined;
  }

  return {
    ...channelConfig,
    youtubeSecretName,
  };
};
