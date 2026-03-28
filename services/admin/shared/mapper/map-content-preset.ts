import type { ContentPreset } from "../../../shared/lib/contracts/content-presets";
import type { ContentPresetDto } from "../types";

export const mapContentPreset = (preset: ContentPreset): ContentPresetDto => {
  return {
    presetId: preset.presetId,
    name: preset.name,
    description: preset.description,
    isActive: preset.isActive,
    format: preset.format,
    duration: preset.duration,
    platformPresets: preset.platformPresets,
    styleTags: preset.styleTags,
    assetStrategy: preset.assetStrategy,
    capabilities: preset.capabilities,
    defaultPolicy: preset.defaultPolicy,
    promptOverrides: preset.promptOverrides,
    createdAt: preset.createdAt,
    updatedAt: preset.updatedAt,
  };
};
