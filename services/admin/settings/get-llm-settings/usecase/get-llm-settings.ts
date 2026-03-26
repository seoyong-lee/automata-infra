import type { LlmSettingsDto } from "../../../shared/types";
import { mapLlmStepSettingsDto } from "../../../shared/mapper/map-llm-step-settings";
import { listLlmSettings } from "../repo/list-llm-settings";

export const getLlmSettings = async (): Promise<LlmSettingsDto> => {
  const items = await listLlmSettings();

  return {
    items: items.map(mapLlmStepSettingsDto),
  };
};
