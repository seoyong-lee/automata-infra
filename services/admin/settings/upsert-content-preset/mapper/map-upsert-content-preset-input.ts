import type { UpsertContentPresetInput } from "../../../../shared/lib/contracts/content-presets";

type UpsertContentPresetArgs = UpsertContentPresetInput & { presetId: string };

export const mapUpsertContentPresetInput = (input: UpsertContentPresetArgs) => {
  return {
    preset: {
      presetId: input.presetId,
      name: input.name,
      description: input.description,
      isActive: input.isActive ?? true,
      format: input.format,
      duration: input.duration,
      platformPresets: input.platformPresets,
      styleTags: input.styleTags,
      assetStrategy: input.assetStrategy,
      capabilities: input.capabilities,
      defaultPolicy: input.defaultPolicy,
      promptOverrides: input.promptOverrides,
    },
  };
};
