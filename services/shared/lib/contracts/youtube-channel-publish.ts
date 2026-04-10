import { z } from "zod";

/** YouTube Data API v3 업로드·채널 메타와 정렬된 콘텐츠(채널) 확장 필드. */
export const youtubeUploadFormatSchema = z.enum(["standard", "shorts"]);

export const contentYoutubeChannelExtensionSchema = z.object({
  youtubeExternalChannelId: z.string().trim().min(1).optional(),
  youtubeChannelTitle: z.string().optional(),
  youtubeChannelDescription: z.string().optional(),
  youtubeChannelCustomUrl: z.string().trim().min(1).optional(),
  youtubeChannelKeywords: z.string().optional(),
  youtubeChannelSyncedAt: z.string().trim().min(1).optional(),
  youtubeDefaultTags: z.array(z.string().trim().min(1)).optional(),
  youtubeDefaultLanguage: z
    .string()
    .trim()
    .min(2)
    .regex(/^[a-z]{2}(-[A-Za-z0-9]+)?$/)
    .optional(),
  youtubeNotifySubscribers: z.boolean().optional(),
  youtubeMadeForKids: z.boolean().optional(),
  youtubeUploadFormat: youtubeUploadFormatSchema.optional(),
});

export type ContentYoutubeChannelExtension = z.infer<
  typeof contentYoutubeChannelExtensionSchema
>;

export const pushYoutubeChannelToGoogleInputSchema = z
  .object({
    contentId: z.string().trim().min(1),
    title: z.string().trim().min(1).optional(),
    description: z.string().optional(),
    /** YouTube `brandingSettings.channel.keywords` (공백 구분 문자열). */
    channelKeywords: z.string().optional(),
  })
  .strict();

export type PushYoutubeChannelToGoogleInput = z.infer<
  typeof pushYoutubeChannelToGoogleInputSchema
>;

export const syncYoutubeChannelMetadataInputSchema = z
  .object({
    contentId: z.string().trim().min(1),
  })
  .strict();

export type SyncYoutubeChannelMetadataInput = z.infer<
  typeof syncYoutubeChannelMetadataInputSchema
>;
