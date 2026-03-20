import type { LlmStepSettings } from '@/entities/llm-step';
import { toNumberFieldValue } from '@/shared/lib/form';
import { StepFormState } from '../model/form';

export const toStepFormState = (settings: LlmStepSettings): StepFormState => {
  return {
    provider: settings.provider,
    model: settings.model,
    temperature: String(settings.temperature),
    maxOutputTokens: toNumberFieldValue(settings.maxOutputTokens),
    secretIdEnvVar: settings.secretIdEnvVar,
    promptVersion: settings.promptVersion,
    systemPrompt: settings.systemPrompt,
    userPrompt: settings.userPrompt,
  };
};
