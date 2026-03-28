import { renderPrompt } from "./render-prompt";
import type {
  GenerateStructuredDataInput,
  GenerateStructuredDataResult,
  LlmPromptTemplate,
} from "./types";
import { generateStructuredDataWithProvider } from "../providers/llm";
import { getLlmStepSettings } from "../store/llm-config";

export const applyPromptTemplateOverride = (
  template: LlmPromptTemplate,
  override?: GenerateStructuredDataInput<unknown>["promptTemplateOverride"],
): LlmPromptTemplate => {
  if (!override) {
    return template;
  }
  return {
    ...template,
    version: `${template.version}:preset-override`,
    systemPrompt: override.systemPrompt,
    userPrompt: override.userPrompt,
  };
};

export const generateStepStructuredData = async <T>(
  input: GenerateStructuredDataInput<T>,
): Promise<GenerateStructuredDataResult<T>> => {
  const settings = await getLlmStepSettings(input.stepKey);
  const promptTemplate = applyPromptTemplateOverride(
    settings.promptTemplate,
    input.promptTemplateOverride,
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
  PromptTemplateOverride,
  PromptVariables,
} from "./types";
