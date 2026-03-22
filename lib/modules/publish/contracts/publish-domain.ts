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
