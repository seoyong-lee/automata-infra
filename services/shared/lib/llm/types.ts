export type LlmProvider = "openai" | "gemini" | "bedrock";

export type LlmStepKey = "topic-plan" | "scene-json" | "metadata";

export type PromptVariableValue = string | number | boolean | null | undefined;

export type PromptVariables = Record<string, PromptVariableValue>;

export type LlmStepConfig = {
  stepKey: LlmStepKey;
  provider: LlmProvider;
  model: string;
  temperature: number;
  maxOutputTokens?: number;
  secretIdEnvVar: string;
};

export type LlmPromptTemplate = {
  stepKey: LlmStepKey;
  version: string;
  systemPrompt: string;
  userPrompt: string;
};

export type LlmStepSettings = {
  config: LlmStepConfig;
  promptTemplate: LlmPromptTemplate;
  updatedAt: string;
  updatedBy: string;
};

export type GenerateStructuredDataInput<T> = {
  jobId: string;
  stepKey: LlmStepKey;
  variables: PromptVariables;
  validate: (payload: unknown) => T;
  buildMockResult: () => T;
};

export type GenerateStructuredDataResult<T> = {
  output: T;
  metadata: {
    provider: string;
    model: string;
    mocked: boolean;
    promptVersion: string;
    providerLogS3Key: string;
  };
};

export type GenerateStructuredData = <T>(
  input: GenerateStructuredDataInput<T>,
) => Promise<GenerateStructuredDataResult<T>>;
