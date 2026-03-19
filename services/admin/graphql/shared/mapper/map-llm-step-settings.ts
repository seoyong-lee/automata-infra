import type { LlmProvider, LlmStepSettingsDto } from "../types";
import type { LlmStepSettings } from "../../../../shared/lib/llm";

const mapProvider = (
  provider: LlmStepSettings["config"]["provider"],
): LlmProvider => {
  switch (provider) {
    case "openai":
      return "OPENAI";
    case "gemini":
      return "GEMINI";
    case "bedrock":
      return "BEDROCK";
  }
};

export const mapLlmStepSettingsDto = (
  settings: LlmStepSettings,
): LlmStepSettingsDto => {
  return {
    stepKey: settings.config.stepKey,
    provider: mapProvider(settings.config.provider),
    model: settings.config.model,
    temperature: settings.config.temperature,
    maxOutputTokens: settings.config.maxOutputTokens,
    secretIdEnvVar: settings.config.secretIdEnvVar,
    promptVersion: settings.promptTemplate.version,
    systemPrompt: settings.promptTemplate.systemPrompt,
    userPrompt: settings.promptTemplate.userPrompt,
    updatedAt: settings.updatedAt,
    updatedBy: settings.updatedBy,
  };
};
