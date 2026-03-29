import { z } from "zod";
import {
  assetPoolAssetTypeSchema,
  assetPoolReviewStatusSchema,
  assetPoolSourceTypeSchema,
} from "./asset-pool";

const nonEmpty = z.string().trim().min(1);

const tagListSchema = z
  .array(nonEmpty)
  .max(20)
  .optional()
  .transform((value) => value ?? []);

export const listAssetPoolAssetsArgsSchema = z
  .object({
    assetType: assetPoolAssetTypeSchema.optional(),
    sourceType: assetPoolSourceTypeSchema.optional(),
    reviewStatus: assetPoolReviewStatusSchema.optional(),
    tags: tagListSchema,
    limit: z.number().int().positive().max(100).optional().default(50),
    nextToken: nonEmpty.optional(),
  })
  .strict();

export const registerAssetPoolAssetInputSchema = z
  .object({
    assetType: assetPoolAssetTypeSchema,
    sourceType: assetPoolSourceTypeSchema.optional().default("internal"),
    provider: nonEmpty.optional(),
    storageKey: nonEmpty,
    thumbnailKey: nonEmpty.optional(),
    sourceUrl: nonEmpty.optional(),
    durationSec: z.number().positive().optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    visualTags: z.array(nonEmpty).max(30).optional().default([]),
    moodTags: z.array(nonEmpty).max(20).optional().default([]),
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
    reviewStatus: assetPoolReviewStatusSchema.optional().default("approved"),
  })
  .strict();

export type ListAssetPoolAssetsArgs = z.infer<
  typeof listAssetPoolAssetsArgsSchema
>;
export type RegisterAssetPoolAssetInput = z.infer<
  typeof registerAssetPoolAssetInputSchema
>;

export const parseListAssetPoolAssetsArgs = (
  payload: unknown,
): ListAssetPoolAssetsArgs => {
  return listAssetPoolAssetsArgsSchema.parse(payload);
};

export const parseRegisterAssetPoolAssetInput = (
  payload: unknown,
): RegisterAssetPoolAssetInput => {
  return registerAssetPoolAssetInputSchema.parse(payload);
};
