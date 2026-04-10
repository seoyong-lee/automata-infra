import { z } from "zod";

const nonEmpty = z.string().trim().min(1);

export const assetPoolAssetTypeSchema = z.enum(["image", "video", "audio"]);
export const assetPoolSourceTypeSchema = z.enum([
  "pool",
  "stock",
  "ai",
  "internal",
]);
export const assetPoolReviewStatusSchema = z.enum([
  "approved",
  "pending",
  "rejected",
]);

export const assetPoolItemSchema = z
  .object({
    assetId: nonEmpty,
    assetType: assetPoolAssetTypeSchema,
    sourceType: assetPoolSourceTypeSchema,
    provider: nonEmpty.optional(),
    storageKey: nonEmpty,
    thumbnailKey: nonEmpty.optional(),
    sourceUrl: nonEmpty.optional(),
    durationSec: z.number().positive().optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    visualTags: z.array(nonEmpty).default([]),
    moodTags: z.array(nonEmpty).default([]),
    containsPeople: z.boolean().optional(),
    containsLogo: z.boolean().optional(),
    containsText: z.boolean().optional(),
    containsWatermark: z.boolean().optional(),
    qualityScore: z.number().min(0).max(1).optional(),
    reusabilityScore: z.number().min(0).max(1).optional(),
    licenseType: nonEmpty.optional(),
    creatorName: nonEmpty.optional(),
    attributionRequired: z.boolean().optional(),
    commercialUseAllowed: z.boolean().optional(),
    reviewStatus: assetPoolReviewStatusSchema,
    ingestedAt: nonEmpty,
    updatedAt: nonEmpty,
  })
  .strict();

export type AssetPoolAssetType = z.infer<typeof assetPoolAssetTypeSchema>;
export type AssetPoolSourceType = z.infer<typeof assetPoolSourceTypeSchema>;
export type AssetPoolReviewStatus = z.infer<typeof assetPoolReviewStatusSchema>;
export type AssetPoolItem = z.infer<typeof assetPoolItemSchema>;

export const parseAssetPoolItem = (payload: unknown): AssetPoolItem => {
  return assetPoolItemSchema.parse(payload);
};
