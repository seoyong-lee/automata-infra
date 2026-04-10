import { putLlmStepSettings } from "../../../../shared/lib/store/llm-config";
import type { LlmProvider } from "../../../shared/types";
import type { LlmStepSettings } from "../../../../shared/lib/llm";
import { badUserInput } from "../../../shared/errors";

const mapProvider = (
  provider: LlmProvider,
): LlmStepSettings["config"]["provider"] => {
  switch (provider) {
    case "OPENAI":
      return "openai";
    case "GEMINI":
      throw badUserInput("provider GEMINI is not supported by runtime yet");
    case "BEDROCK":
      return "bedrock";
  }
};

export const updateLlmStepSettings = async (input: {
  actor: string;
  stepKey: "job-plan" | "scene-json" | "metadata" | "youtube-publish-metadata";
  provider: LlmProvider;
  model: string;
  temperature: number;
  maxOutputTokens?: number;
  secretIdEnvVar: string;
  promptVersion: string;
  systemPrompt: string;
  userPrompt: string;
}): Promise<LlmStepSettings> => {
  return putLlmStepSettings(
    {
      config: {
        stepKey: input.stepKey,
        provider: mapProvider(input.provider),
        model: input.model,
        temperature: input.temperature,
        maxOutputTokens: input.maxOutputTokens,
        secretIdEnvVar: input.secretIdEnvVar,
      },
      promptTemplate: {
        stepKey: input.stepKey,
        version: input.promptVersion,
        systemPrompt: input.systemPrompt,
        userPrompt: input.userPrompt,
      },
      updatedAt: "",
      updatedBy: input.actor,
    },
    input.actor,
  );
};
