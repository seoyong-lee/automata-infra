import { listContentPresets as listPresetItems } from "../../../../shared/lib/store/content-presets";
import { mapContentPreset } from "../../../shared/mapper/map-content-preset";

export const listContentPresets = async () => {
  const items = await listPresetItems();
  return items.map(mapContentPreset);
};
