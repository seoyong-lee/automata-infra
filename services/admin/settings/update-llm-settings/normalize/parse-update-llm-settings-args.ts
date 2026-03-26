import { badUserInput } from "../../../shared/errors";
import type { LlmProvider } from "../../../shared/types";

type UpdateLlmStepSettingsInput = {
  stepKey: "job-plan" | "scene-json" | "metadata";
  provider: LlmProvider;
  model: string;
  temperature: number;
  maxOutputTokens?: number;
  secretIdEnvVar: string;
  promptVersion: string;
  systemPrompt: string;
  userPrompt: string;
};

const asString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw badUserInput(`${field} is required`);
  }

  return value.trim();
};

const asProvider = (value: unknown): LlmProvider => {
  if (value === "OPENAI" || value === "GEMINI" || value === "BEDROCK") {
    return value;
  }

  throw badUserInput("provider is invalid");
};

const isSupportedStepKey = (
  stepKey: string,
): stepKey is UpdateLlmStepSettingsInput["stepKey"] => {
  return (
    stepKey === "job-plan" || stepKey === "scene-json" || stepKey === "metadata"
  );
};

export const parseUpdateLlmSettingsArgs = (
  args: Record<string, unknown>,
): UpdateLlmStepSettingsInput => {
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : null;

  if (!input) {
    throw badUserInput("input is required");
  }

  const stepKey = asString(input.stepKey, "stepKey");
  if (!isSupportedStepKey(stepKey)) {
    throw badUserInput("stepKey is invalid");
  }

  const temperature = input.temperature;
  if (typeof temperature !== "number" || Number.isNaN(temperature)) {
    throw badUserInput("temperature is invalid");
  }

  const maxOutputTokens = input.maxOutputTokens;
  if (
    maxOutputTokens !== undefined &&
    (typeof maxOutputTokens !== "number" || Number.isNaN(maxOutputTokens))
  ) {
    throw badUserInput("maxOutputTokens is invalid");
  }

  return {
    stepKey,
    provider: asProvider(input.provider),
    model: asString(input.model, "model"),
    temperature,
    maxOutputTokens:
      typeof maxOutputTokens === "number" ? maxOutputTokens : undefined,
    secretIdEnvVar: asString(input.secretIdEnvVar, "secretIdEnvVar"),
    promptVersion: asString(input.promptVersion, "promptVersion"),
    systemPrompt: asString(input.systemPrompt, "systemPrompt"),
    userPrompt: asString(input.userPrompt, "userPrompt"),
  };
};
