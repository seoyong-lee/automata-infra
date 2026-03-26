import { mapLlmStepSettingsDto } from "../../../shared/mapper/map-llm-step-settings";
import type { LlmStepSettingsDto, LlmProvider } from "../../../shared/types";
import { updateLlmStepSettings } from "../repo/update-llm-step-settings";

export const updateAdminLlmStepSettings = async (input: {
  actor: string;
  stepKey: "job-plan" | "scene-json" | "metadata";
  provider: LlmProvider;
  model: string;
  temperature: number;
  maxOutputTokens?: number;
  secretIdEnvVar: string;
  promptVersion: string;
  systemPrompt: string;
  userPrompt: string;
}): Promise<LlmStepSettingsDto> => {
  const settings = await updateLlmStepSettings(input);
  return mapLlmStepSettingsDto(settings);
};
