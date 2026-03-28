import { z } from "zod";
import { randomUUID } from "crypto";

const nonEmpty = z.string().trim().min(1);

export const contentPresetFormatSchema = z.enum([
  "generative-video",
  "template-short",
  "still-motion-short",
  "narrated-explainer",
  "cinematic-visual",
]);

export const contentPresetDurationSchema = z.enum(["short", "long"]);

export const contentPresetPlatformPresetSchema = z.enum([
  "tiktok-reels-shorts",
  "9:16",
  "1:1",
  "4:5",
  "16:9",
]);

export const contentPresetStyleTagSchema = z.enum([
  "cinematic",
  "minimal",
  "bold-caption",
  "news",
  "horror",
  "luxury",
  "cute",
  "retro",
  "meme",
  "documentary",
  "dramatic",
  "aesthetic",
]);

export const contentPresetAssetStrategySchema = z.enum([
  "ai-video",
  "ai-image",
  "stock-video",
  "stock-image",
  "mixed",
]);

export const contentPresetVoiceModeSchema = z.enum([
  "required",
  "optional",
  "disabled",
]);

export const contentPresetSubtitleModeSchema = z.enum([
  "required",
  "optional",
  "minimal",
  "disabled",
]);

export const contentPresetLayoutModeSchema = z.enum([
  "template",
  "free-scene",
  "still-motion",
  "cinematic",
]);

export const contentPresetCapabilitiesSchema = z
  .object({
    voiceMode: contentPresetVoiceModeSchema,
    subtitleMode: contentPresetSubtitleModeSchema,
    layoutMode: contentPresetLayoutModeSchema,
    supportsAiVideo: z.boolean(),
    supportsAiImage: z.boolean(),
    supportsStockVideo: z.boolean(),
    supportsStockImage: z.boolean(),
    supportsBgm: z.boolean(),
    supportsSfx: z.boolean(),
    supportsVoiceProfile: z.boolean(),
    supportsOverlayTemplate: z.boolean(),
  })
  .strict();

export const assetMenuModelSchema = z
  .object({
    showScript: z.boolean(),
    showNarration: z.boolean(),
    showSubtitles: z.boolean(),
    showImageAssets: z.boolean(),
    showVideoAssets: z.boolean(),
    showStockPicker: z.boolean(),
    showBgm: z.boolean(),
    showSfx: z.boolean(),
    showOverlayEditor: z.boolean(),
    recommendedGenerationOrder: z.array(nonEmpty),
  })
  .strict();

export const contentPresetDefaultPolicySchema = z
  .object({
    stylePreset: nonEmpty,
    sceneCountMin: z.number().int().positive().optional(),
    sceneCountMax: z.number().int().positive().optional(),
    subtitleStylePreset: nonEmpty.optional(),
    renderPreset: nonEmpty.optional(),
    preferredImageProvider: nonEmpty.optional(),
    preferredVideoProvider: nonEmpty.optional(),
    preferredVoiceProfileId: nonEmpty.optional(),
  })
  .strict();

const promptTemplateBody = z.string().trim().min(1).max(12000);

export const contentPresetPromptOverrideSchema = z
  .object({
    systemPrompt: promptTemplateBody,
    userPrompt: promptTemplateBody,
  })
  .strict();

export const contentPresetPromptOverridesSchema = z
  .object({
    jobPlan: contentPresetPromptOverrideSchema.optional(),
    sceneJson: contentPresetPromptOverrideSchema.optional(),
    metadata: contentPresetPromptOverrideSchema.optional(),
  })
  .strict();

export const contentPresetSchema = z
  .object({
    presetId: nonEmpty,
    name: nonEmpty,
    description: nonEmpty.optional(),
    isActive: z.boolean(),
    format: contentPresetFormatSchema,
    duration: contentPresetDurationSchema,
    platformPresets: z.array(contentPresetPlatformPresetSchema).min(1),
    styleTags: z.array(contentPresetStyleTagSchema),
    assetStrategy: contentPresetAssetStrategySchema,
    capabilities: contentPresetCapabilitiesSchema,
    defaultPolicy: contentPresetDefaultPolicySchema,
    promptOverrides: contentPresetPromptOverridesSchema.optional(),
    createdAt: nonEmpty,
    updatedAt: nonEmpty,
  })
  .strict();

export const contentPresetRefSchema = z
  .object({
    presetId: nonEmpty,
  })
  .strict();

export const presetSnapshotSchema = z
  .object({
    presetId: nonEmpty,
    name: nonEmpty,
    format: contentPresetFormatSchema,
    duration: contentPresetDurationSchema,
    platformPresets: z.array(contentPresetPlatformPresetSchema).min(1),
    styleTags: z.array(contentPresetStyleTagSchema),
    assetStrategy: contentPresetAssetStrategySchema,
    capabilities: contentPresetCapabilitiesSchema,
    defaultPolicy: contentPresetDefaultPolicySchema,
    promptOverrides: contentPresetPromptOverridesSchema.optional(),
  })
  .strict();

export const resolvedPolicySchema = z
  .object({
    presetId: nonEmpty,
    format: contentPresetFormatSchema,
    duration: contentPresetDurationSchema,
    primaryPlatformPreset: contentPresetPlatformPresetSchema,
    styleTags: z.array(contentPresetStyleTagSchema),
    assetStrategy: contentPresetAssetStrategySchema,
    stylePreset: nonEmpty,
    capabilities: contentPresetCapabilitiesSchema,
    assetMenu: assetMenuModelSchema,
    sceneCountMin: z.number().int().positive().optional(),
    sceneCountMax: z.number().int().positive().optional(),
    subtitleStylePreset: nonEmpty.optional(),
    renderPreset: nonEmpty.optional(),
    preferredImageProvider: nonEmpty.optional(),
    preferredVideoProvider: nonEmpty.optional(),
    preferredVoiceProfileId: nonEmpty.optional(),
    promptOverrides: contentPresetPromptOverridesSchema.optional(),
  })
  .strict();

export const upsertContentPresetInputSchema = z
  .object({
    presetId: nonEmpty.optional(),
    name: nonEmpty,
    description: nonEmpty.optional(),
    isActive: z.boolean().optional(),
    format: contentPresetFormatSchema,
    duration: contentPresetDurationSchema,
    platformPresets: z.array(contentPresetPlatformPresetSchema).min(1),
    styleTags: z.array(contentPresetStyleTagSchema),
    assetStrategy: contentPresetAssetStrategySchema,
    capabilities: contentPresetCapabilitiesSchema,
    defaultPolicy: contentPresetDefaultPolicySchema,
    promptOverrides: contentPresetPromptOverridesSchema.optional(),
  })
  .strict();

export type ContentPresetFormat = z.infer<typeof contentPresetFormatSchema>;
export type ContentPresetDuration = z.infer<typeof contentPresetDurationSchema>;
export type ContentPresetPlatformPreset = z.infer<
  typeof contentPresetPlatformPresetSchema
>;
export type ContentPresetStyleTag = z.infer<typeof contentPresetStyleTagSchema>;
export type ContentPresetAssetStrategy = z.infer<
  typeof contentPresetAssetStrategySchema
>;
export type ContentPresetCapabilities = z.infer<
  typeof contentPresetCapabilitiesSchema
>;
export type ContentPresetDefaultPolicy = z.infer<
  typeof contentPresetDefaultPolicySchema
>;
export type ContentPresetPromptOverride = z.infer<
  typeof contentPresetPromptOverrideSchema
>;
export type ContentPresetPromptOverrides = z.infer<
  typeof contentPresetPromptOverridesSchema
>;
export type AssetMenuModel = z.infer<typeof assetMenuModelSchema>;
export type ContentPreset = z.infer<typeof contentPresetSchema>;
export type ContentPresetRef = z.infer<typeof contentPresetRefSchema>;
export type PresetSnapshot = z.infer<typeof presetSnapshotSchema>;
export type ResolvedPolicy = z.infer<typeof resolvedPolicySchema>;
export type UpsertContentPresetInput = z.infer<
  typeof upsertContentPresetInputSchema
>;

const buildRecommendedGenerationOrder = (
  capabilities: ContentPresetCapabilities,
): string[] => {
  const order = ["script"];

  if (
    capabilities.supportsAiImage ||
    capabilities.supportsStockImage ||
    capabilities.supportsAiVideo ||
    capabilities.supportsStockVideo
  ) {
    if (capabilities.layoutMode === "still-motion") {
      order.push("image");
    } else if (capabilities.voiceMode === "required") {
      order.push("voice", "image", "video");
    } else {
      order.push("image", "video", "voice");
    }
  }

  if (capabilities.supportsBgm) {
    order.push("bgm");
  }
  if (capabilities.supportsOverlayTemplate) {
    order.push("overlay");
  }

  return Array.from(new Set(order));
};

export const buildAssetMenuModel = (
  capabilities: ContentPresetCapabilities,
): AssetMenuModel => {
  return {
    showScript: true,
    showNarration: capabilities.voiceMode !== "disabled",
    showSubtitles: capabilities.subtitleMode !== "disabled",
    showImageAssets:
      capabilities.supportsAiImage || capabilities.supportsStockImage,
    showVideoAssets:
      capabilities.supportsAiVideo || capabilities.supportsStockVideo,
    showStockPicker:
      capabilities.supportsStockImage || capabilities.supportsStockVideo,
    showBgm: capabilities.supportsBgm,
    showSfx: capabilities.supportsSfx,
    showOverlayEditor: capabilities.supportsOverlayTemplate,
    recommendedGenerationOrder: buildRecommendedGenerationOrder(capabilities),
  };
};

export const buildPresetSnapshot = (preset: ContentPreset): PresetSnapshot => {
  return {
    presetId: preset.presetId,
    name: preset.name,
    format: preset.format,
    duration: preset.duration,
    platformPresets: preset.platformPresets,
    styleTags: preset.styleTags,
    assetStrategy: preset.assetStrategy,
    capabilities: preset.capabilities,
    defaultPolicy: preset.defaultPolicy,
    ...(preset.promptOverrides
      ? { promptOverrides: preset.promptOverrides }
      : {}),
  };
};

export const buildResolvedPolicy = (
  snapshot: PresetSnapshot,
  input?: { stylePreset?: string },
): ResolvedPolicy => {
  return {
    presetId: snapshot.presetId,
    format: snapshot.format,
    duration: snapshot.duration,
    primaryPlatformPreset: snapshot.platformPresets[0],
    styleTags: snapshot.styleTags,
    assetStrategy: snapshot.assetStrategy,
    stylePreset:
      input?.stylePreset?.trim() || snapshot.defaultPolicy.stylePreset,
    capabilities: snapshot.capabilities,
    assetMenu: buildAssetMenuModel(snapshot.capabilities),
    sceneCountMin: snapshot.defaultPolicy.sceneCountMin,
    sceneCountMax: snapshot.defaultPolicy.sceneCountMax,
    subtitleStylePreset: snapshot.defaultPolicy.subtitleStylePreset,
    renderPreset: snapshot.defaultPolicy.renderPreset,
    preferredImageProvider: snapshot.defaultPolicy.preferredImageProvider,
    preferredVideoProvider: snapshot.defaultPolicy.preferredVideoProvider,
    preferredVoiceProfileId: snapshot.defaultPolicy.preferredVoiceProfileId,
    ...(snapshot.promptOverrides
      ? { promptOverrides: snapshot.promptOverrides }
      : {}),
  };
};

export const parseContentPreset = (payload: unknown): ContentPreset => {
  return contentPresetSchema.parse(payload);
};

export const parsePresetSnapshot = (payload: unknown): PresetSnapshot => {
  return presetSnapshotSchema.parse(payload);
};

export const parseResolvedPolicy = (payload: unknown): ResolvedPolicy => {
  return resolvedPolicySchema.parse(payload);
};

export const parseUpsertContentPresetInput = (
  payload: unknown,
): UpsertContentPresetInput => {
  return upsertContentPresetInputSchema.parse(payload);
};

export const buildContentPresetId = (): string => {
  return `preset_${randomUUID().replace(/-/g, "")}`;
};
