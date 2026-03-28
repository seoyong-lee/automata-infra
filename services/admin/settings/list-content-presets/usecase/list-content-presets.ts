import { listContentPresets as listPresetItems } from "../../../../shared/lib/store/content-presets";
import { mapContentPreset } from "../../../shared/mapper/map-content-preset";

export const listContentPresets = async (input?: {
  includeInactive?: boolean;
}) => {
  const items = await listPresetItems(input);
  return items.map(mapContentPreset);
};
