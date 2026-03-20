import { generateOpenAiStructuredData } from "./openai";
import { generateBedrockStructuredData } from "./bedrock";
import type {
  GenerateStructuredDataResult,
  LlmPromptTemplate,
  LlmStepConfig,
} from "../../llm/types";

const FALLBACK_MODEL = "gpt-5.4-mini";
const FALLBACK_SECRET_ENV = "OPENAI_SECRET_ID";

const buildFallbackConfig = (config: LlmStepConfig): LlmStepConfig => {
  return {
    ...config,
    provider: "openai",
    model: FALLBACK_MODEL,
    secretIdEnvVar: FALLBACK_SECRET_ENV,
  };
};

export const generateStructuredDataWithProvider = async <T>(input: {
  jobId: string;
  stepKey: string;
  prompt: string;
  template: LlmPromptTemplate;
  config: LlmStepConfig;
  validate: (payload: unknown) => T;
  buildMockResult: () => T;
}): Promise<GenerateStructuredDataResult<T>> => {
  try {
    switch (input.config.provider) {
      case "openai":
        return await generateOpenAiStructuredData(input);
      case "bedrock":
        return await generateBedrockStructuredData(input);
      default:
        throw new Error(`Unsupported LLM provider: ${input.config.provider}`);
    }
  } catch (error) {
    const skipFallback =
      input.config.provider === "openai" &&
      input.config.model === FALLBACK_MODEL &&
      input.config.secretIdEnvVar === FALLBACK_SECRET_ENV;
    if (skipFallback) {
      throw error;
    }

    return generateOpenAiStructuredData({
      ...input,
      config: buildFallbackConfig(input.config),
    });
  }
};
