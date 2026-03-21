import type {
  LlmPromptTemplate,
  LlmStepConfig,
  LlmStepKey,
  LlmStepSettings,
} from "./types";

export const defaultStepConfigs: Record<LlmStepKey, LlmStepConfig> = {
  "topic-plan": {
    stepKey: "topic-plan",
    provider: "bedrock",
    model: "anthropic.claude-sonnet-4-6-v1:0",
    temperature: 0.7,
    maxOutputTokens: 700,
    secretIdEnvVar: "BEDROCK_LLM_SECRET_ID",
  },
  "scene-json": {
    stepKey: "scene-json",
    provider: "bedrock",
    model: "anthropic.claude-sonnet-4-6-v1:0",
    temperature: 0.5,
    maxOutputTokens: 2400,
    secretIdEnvVar: "BEDROCK_LLM_SECRET_ID",
  },
  metadata: {
    stepKey: "metadata",
    provider: "bedrock",
    model: "anthropic.claude-haiku-4-5-v1:0",
    temperature: 0.3,
    maxOutputTokens: 700,
    secretIdEnvVar: "BEDROCK_LLM_SECRET_ID",
  },
};

export const defaultPromptTemplates: Record<LlmStepKey, LlmPromptTemplate> = {
  "topic-plan": {
    stepKey: "topic-plan",
    version: "v1-file-registry",
    systemPrompt:
      "You are an AI video planning assistant. Return valid JSON only.",
    userPrompt: [
      "Create a short-form video topic plan for the following channel context.",
      'Return JSON with keys: "titleIdea", "targetDurationSec", "stylePreset".',
      "Constraints:",
      "- titleIdea must be specific and clickable without being sensational.",
      "- targetDurationSec should be between 30 and 60 seconds.",
      "- stylePreset should be a concise snake_case style label.",
      "",
      "Inputs:",
      "- contentId: {{contentId}}",
      "- targetLanguage: {{targetLanguage}}",
    ].join("\n"),
  },
  "scene-json": {
    stepKey: "scene-json",
    version: "v1-file-registry",
    systemPrompt:
      "You write concise short-form video scenes. Return valid JSON only.",
    userPrompt: [
      "Create a scene JSON document for a short-form AI video pipeline.",
      'Return JSON with keys: "videoTitle", "language", "scenes".',
      'Each scene must include: "sceneId", "durationSec", "narration", "imagePrompt", "subtitle".',
      'Each scene may include: "videoPrompt", "bgmMood", "sfx".',
      "Constraints:",
      "- sceneId starts at 1 and increments by 1.",
      "- durationSec should usually be between 6 and 10 seconds.",
      "- subtitle should be shorter than narration.",
      "- imagePrompt and videoPrompt should be cinematic and visually specific.",
      "",
      "Inputs:",
      "- titleIdea: {{titleIdea}}",
      "- targetLanguage: {{targetLanguage}}",
      "- targetDurationSec: {{targetDurationSec}}",
      "- stylePreset: {{stylePreset}}",
    ].join("\n"),
  },
  metadata: {
    stepKey: "metadata",
    version: "v1-file-registry",
    systemPrompt:
      "You generate video metadata with strong SEO structure. Return valid JSON only.",
    userPrompt: [
      "Generate metadata for a short-form video.",
      'Return JSON with keys: "title", "description", "tags".',
      "Constraints:",
      "- title should be concise and click-worthy without sensational claims.",
      "- description should be 2 to 3 short sentences with clear context.",
      "- tags should be a focused array of lower-case keywords.",
      "",
      "Inputs:",
      "- videoTitle: {{videoTitle}}",
      "- targetLanguage: {{targetLanguage}}",
      "- stylePreset: {{stylePreset}}",
    ].join("\n"),
  },
};

export const loadDefaultLlmStepConfig = (
  stepKey: LlmStepKey,
): LlmStepConfig => {
  return defaultStepConfigs[stepKey];
};

export const loadDefaultLlmPromptTemplate = (
  stepKey: LlmStepKey,
): LlmPromptTemplate => {
  return defaultPromptTemplates[stepKey];
};

export const loadDefaultLlmStepSettings = (
  stepKey: LlmStepKey,
): LlmStepSettings => {
  return {
    config: loadDefaultLlmStepConfig(stepKey),
    promptTemplate: loadDefaultLlmPromptTemplate(stepKey),
    updatedAt: "1970-01-01T00:00:00.000Z",
    updatedBy: "system-default",
  };
};
