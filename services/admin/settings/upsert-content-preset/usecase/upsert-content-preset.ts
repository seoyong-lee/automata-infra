import type { UpsertContentPresetInput } from "../../../../shared/lib/contracts/content-presets";
import { putContentPreset } from "../../../../shared/lib/store/content-presets";
import { mapContentPreset } from "../../../shared/mapper/map-content-preset";

type UpsertContentPresetArgs = UpsertContentPresetInput & { presetId: string };

export const upsertContentPreset = async (input: UpsertContentPresetArgs) => {
  const item = await putContentPreset({
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
    },
  });

  return mapContentPreset(item);
};
