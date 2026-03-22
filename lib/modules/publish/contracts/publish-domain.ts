import { z } from "zod";

/** 외부 매체 (GraphQL enum과 동일한 문자열) */
export const publishPlatformSchema = z.enum(["YOUTUBE", "TIKTOK", "INSTAGRAM"]);
export type PublishPlatform = z.infer<typeof publishPlatformSchema>;

export const platformConnectionStatusSchema = z.enum([
  "CONNECTED",
  "EXPIRED",
  "ERROR",
  "DISCONNECTED",
]);
export type PlatformConnectionStatus = z.infer<
  typeof platformConnectionStatusSchema
>;

export const publishTargetStatusSchema = z.enum([
  "QUEUED",
  "SCHEDULED",
  "PUBLISHING",
  "PUBLISHED",
  "FAILED",
  "SKIPPED",
]);
export type PublishTargetStatus = z.infer<typeof publishTargetStatusSchema>;

export const sourceItemStatusSchema = z.enum([
  "IDEATING",
  "READY_FOR_DISTRIBUTION",
  "ARCHIVED",
]);
export type SourceItemStatus = z.infer<typeof sourceItemStatusSchema>;

export const sourceItemSchema = z.object({
  id: z.string().trim().min(1),
  topic: z.string().trim().min(1),
  masterHook: z.string().optional(),
  sourceNotes: z.string().optional(),
  status: sourceItemStatusSchema,
});
export type SourceItem = z.infer<typeof sourceItemSchema>;

export const platformConnectionSchema = z.object({
  platformConnectionId: z.string().trim().min(1),
  channelId: z.string().trim().min(1),
  platform: publishPlatformSchema,
  accountId: z.string().trim().min(1),
  accountHandle: z.string().optional(),
  oauthAccountId: z.string().trim().min(1),
  status: platformConnectionStatusSchema,
  connectedAt: z.string().trim().min(1),
  lastSyncedAt: z.string().optional(),
});
export type PlatformConnection = z.infer<typeof platformConnectionSchema>;

export const publishTargetSchema = z.object({
  publishTargetId: z.string().trim().min(1),
  channelContentItemId: z.string().trim().min(1),
  platformConnectionId: z.string().trim().min(1),
  platform: publishPlatformSchema,
  status: publishTargetStatusSchema,
  scheduledAt: z.string().optional(),
  externalPostId: z.string().optional(),
  externalUrl: z.string().optional(),
  publishError: z.string().optional(),
});
export type PublishTarget = z.infer<typeof publishTargetSchema>;

export const publishTargetRowSchema = publishTargetSchema;
export type PublishTargetRow = z.infer<typeof publishTargetRowSchema>;

export const platformPublishProfileSchema = z.object({
  platformConnectionId: z.string().trim().min(1),
  channelId: z.string().trim().min(1),
  defaultVisibility: z.enum(["private", "unlisted", "public"]).optional(),
  defaultLanguage: z.string().optional(),
  defaultHashtags: z.array(z.string()),
  captionFooterTemplate: z.string().optional(),
  preferredSlots: z.array(z.string()).optional(),
  youtube: z
    .object({
      defaultCategoryId: z.string().optional(),
      defaultPlaylistIds: z.array(z.string()),
      defaultTags: z.array(z.string()),
    })
    .optional(),
  tiktok: z.object({ disclosureTemplate: z.string().optional() }).optional(),
  instagram: z
    .object({ defaultFirstCommentTemplate: z.string().optional() })
    .optional(),
});
export type PlatformPublishProfile = z.infer<
  typeof platformPublishProfileSchema
>;

const platformDraftMetadataSchema = z.object({
  title: z.string().optional(),
  caption: z.string().optional(),
  description: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  visibility: z.string().optional(),
  playlistIds: z.array(z.string()).optional(),
  categoryId: z.string().optional(),
  scheduledAt: z.string().optional(),
  coverAssetId: z.string().optional(),
});

export const contentPublishDraftSchema = z.object({
  channelContentItemId: z.string().trim().min(1),
  globalDraft: z.object({
    title: z.string().optional(),
    caption: z.string().optional(),
    description: z.string().optional(),
    hashtags: z.array(z.string()),
    thumbnailAssetId: z.string().optional(),
  }),
  platformDrafts: z.array(
    z.object({
      platform: publishPlatformSchema,
      targetConnectionId: z.string().trim().min(1),
      enabled: z.boolean(),
      metadata: platformDraftMetadataSchema,
      overrideFields: z.array(z.string()).optional(),
      validationStatus: z.enum(["VALID", "INVALID", "INCOMPLETE"]).optional(),
    }),
  ),
});
export type ContentPublishDraft = z.infer<typeof contentPublishDraftSchema>;

export const persistedPlatformConnectionSchema = z.object({
  platformConnectionId: z.string().trim().min(1),
  channelId: z.string().trim().min(1),
  platform: publishPlatformSchema,
  accountId: z.string().trim().min(1),
  accountHandle: z.string().optional(),
  oauthAccountId: z.string().trim().min(1),
  status: platformConnectionStatusSchema,
  connectedAt: z.string().trim().min(1),
  lastSyncedAt: z.string().optional(),
});
export type PersistedPlatformConnection = z.infer<
  typeof persistedPlatformConnectionSchema
>;
