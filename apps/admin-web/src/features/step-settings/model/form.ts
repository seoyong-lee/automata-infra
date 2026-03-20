import type { LlmProvider } from '@/entities/llm-step';

export type StepFormState = {
  provider: LlmProvider;
  model: string;
  temperature: string;
  maxOutputTokens: string;
  secretIdEnvVar: string;
  promptVersion: string;
  systemPrompt: string;
  userPrompt: string;
};
