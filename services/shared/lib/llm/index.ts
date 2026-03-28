import { renderPrompt } from "./render-prompt";
import type {
  GenerateStructuredDataInput,
  GenerateStructuredDataResult,
  LlmPromptTemplate,
} from "./types";
import { generateStructuredDataWithProvider } from "../providers/llm";
import { getLlmStepSettings } from "../store/llm-config";

const appendSection = (base: string, append?: string): string => {
  const trimmed = append?.trim();
  if (!trimmed) {
    return base;
  }
  return `${base}\n\nPreset override:\n${trimmed}`;
};

export const applyPromptTemplateAppend = (
  template: LlmPromptTemplate,
  append?: GenerateStructuredDataInput<unknown>["promptTemplateAppend"],
): LlmPromptTemplate => {
  if (!append?.systemAppend && !append?.userAppend) {
    return template;
  }
  return {
    ...template,
    systemPrompt: appendSection(template.systemPrompt, append.systemAppend),
    userPrompt: appendSection(template.userPrompt, append.userAppend),
  };
};

export const generateStepStructuredData = async <T>(
  input: GenerateStructuredDataInput<T>,
): Promise<GenerateStructuredDataResult<T>> => {
  const settings = await getLlmStepSettings(input.stepKey);
  const promptTemplate = applyPromptTemplateAppend(
    settings.promptTemplate,
    input.promptTemplateAppend,
  );
  const prompt = renderPrompt(promptTemplate.userPrompt, input.variables);

  return generateStructuredDataWithProvider({
    jobId: input.jobId,
    stepKey: input.stepKey,
    prompt,
    template: promptTemplate,
    config: settings.config,
    validate: input.validate,
    buildMockResult: input.buildMockResult,
  });
};

export type {
  GenerateStructuredData,
  GenerateStructuredDataInput,
  GenerateStructuredDataResult,
  LlmPromptTemplate,
  LlmProvider,
  LlmStepConfig,
  LlmStepKey,
  LlmStepSettings,
  PromptTemplateAppend,
  PromptVariables,
} from "./types";
