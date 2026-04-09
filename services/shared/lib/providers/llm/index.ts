import { generateOpenAiStructuredData } from "./openai";
import { generateBedrockStructuredData } from "./bedrock";
import type {
  GenerateStructuredDataResult,
  LlmPromptTemplate,
  LlmStepConfig,
} from "../../llm/types";

export const generateStructuredDataWithProvider = async <T>(input: {
  jobId: string;
  stepKey: string;
  prompt: string;
  template: LlmPromptTemplate;
  config: LlmStepConfig;
  validate: (payload: unknown) => T;
  buildMockResult: () => T;
}): Promise<GenerateStructuredDataResult<T>> => {
  switch (input.config.provider) {
    case "openai":
      return await generateOpenAiStructuredData(input);
    case "bedrock":
      return await generateBedrockStructuredData(input);
    default:
      throw new Error(`Unsupported LLM provider: ${input.config.provider}`);
  }
};
