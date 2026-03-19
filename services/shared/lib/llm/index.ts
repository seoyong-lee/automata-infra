import { renderPrompt } from "./render-prompt";
import type {
  GenerateStructuredDataInput,
  GenerateStructuredDataResult,
} from "./types";
import { generateStructuredDataWithProvider } from "../providers/llm";
import { getLlmStepSettings } from "../store/llm-config";

export const generateStepStructuredData = async <T>(
  input: GenerateStructuredDataInput<T>,
): Promise<GenerateStructuredDataResult<T>> => {
  const settings = await getLlmStepSettings(input.stepKey);
  const prompt = renderPrompt(
    settings.promptTemplate.userPrompt,
    input.variables,
  );

  return generateStructuredDataWithProvider({
    jobId: input.jobId,
    stepKey: input.stepKey,
    prompt,
    template: settings.promptTemplate,
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
  PromptVariables,
} from "./types";
