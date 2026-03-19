import { loadLlmPromptTemplate, loadLlmStepConfig } from "./registry";
import { renderPrompt } from "./render-prompt";
import type {
  GenerateStructuredDataInput,
  GenerateStructuredDataResult,
} from "./types";
import { generateStructuredDataWithProvider } from "../providers/llm";

export const generateStepStructuredData = async <T>(
  input: GenerateStructuredDataInput<T>,
): Promise<GenerateStructuredDataResult<T>> => {
  const config = loadLlmStepConfig(input.stepKey);
  const template = loadLlmPromptTemplate(input.stepKey);
  const prompt = renderPrompt(template.userPrompt, input.variables);

  return generateStructuredDataWithProvider({
    jobId: input.jobId,
    stepKey: input.stepKey,
    prompt,
    template,
    config,
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
  PromptVariables,
} from "./types";
