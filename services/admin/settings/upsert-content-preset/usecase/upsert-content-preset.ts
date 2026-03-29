import type { UpsertContentPresetInput } from "../../../../shared/lib/contracts/content-presets";
import { putContentPreset } from "../../../../shared/lib/store/content-presets";
import { mapContentPreset } from "../../../shared/mapper/map-content-preset";
import { mapUpsertContentPresetInput } from "../mapper/map-upsert-content-preset-input";

type UpsertContentPresetArgs = UpsertContentPresetInput & { presetId: string };

export const upsertContentPreset = async (input: UpsertContentPresetArgs) => {
  const item = await putContentPreset(mapUpsertContentPresetInput(input));

  return mapContentPreset(item);
};
