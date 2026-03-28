import { softDeleteContentPreset } from "../../../../shared/lib/store/content-presets";
import type { DeleteContentPresetResultDto } from "../../../shared/types";

export const deleteContentPreset = async (
  presetId: string,
): Promise<DeleteContentPresetResultDto> => {
  await softDeleteContentPreset(presetId);
  return {
    ok: true,
    presetId,
  };
};
