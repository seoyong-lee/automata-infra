import {
  getConfigTableName,
  getItemFromTable,
  getOptionalEnv,
  putItemToTable,
  queryItemsFromTable,
} from "../aws/runtime";
import type {
  LlmProvider,
  LlmStepConfig,
  LlmStepKey,
  LlmStepSettings,
  LlmPromptTemplate,
} from "../llm/types";
import { loadDefaultLlmStepSettings } from "../llm/registry";

type LlmConfigItem = {
  PK: "LLM_SETTINGS";
  SK: `STEP#${LlmStepKey}`;
  stepKey: LlmStepKey;
  provider: LlmProvider;
  model: string;
  temperature: number;
  maxOutputTokens?: number;
  secretIdEnvVar: string;
  promptVersion: string;
  systemPrompt: string;
  userPrompt: string;
  updatedAt: string;
  updatedBy: string;
};

const SETTINGS_PK = "LLM_SETTINGS";

const stepSk = (stepKey: LlmStepKey): `STEP#${LlmStepKey}` => {
  return `STEP#${stepKey}`;
};

const hasConfigTable = (): boolean => {
  return Boolean(getOptionalEnv("CONFIG_TABLE_NAME"));
};

const mapItemToSettings = (item: LlmConfigItem): LlmStepSettings => {
  const config: LlmStepConfig = {
    stepKey: item.stepKey,
    provider: item.provider,
    model: item.model,
    temperature: item.temperature,
    maxOutputTokens: item.maxOutputTokens,
    secretIdEnvVar: item.secretIdEnvVar,
  };
  const promptTemplate: LlmPromptTemplate = {
    stepKey: item.stepKey,
    version: item.promptVersion,
    systemPrompt: item.systemPrompt,
    userPrompt: item.userPrompt,
  };

  return {
    config,
    promptTemplate,
    updatedAt: item.updatedAt,
    updatedBy: item.updatedBy,
  };
};

const buildItem = (
  settings: LlmStepSettings,
  actor: string,
  updatedAt: string,
): LlmConfigItem => {
  return {
    PK: SETTINGS_PK,
    SK: stepSk(settings.config.stepKey),
    stepKey: settings.config.stepKey,
    provider: settings.config.provider,
    model: settings.config.model,
    temperature: settings.config.temperature,
    maxOutputTokens: settings.config.maxOutputTokens,
    secretIdEnvVar: settings.config.secretIdEnvVar,
    promptVersion: settings.promptTemplate.version,
    systemPrompt: settings.promptTemplate.systemPrompt,
    userPrompt: settings.promptTemplate.userPrompt,
    updatedAt,
    updatedBy: actor,
  };
};

export const listLlmStepSettings = async (): Promise<LlmStepSettings[]> => {
  const defaults: LlmStepSettings[] = [
    loadDefaultLlmStepSettings("topic-plan"),
    loadDefaultLlmStepSettings("scene-json"),
  ];

  if (!hasConfigTable()) {
    return defaults;
  }

  const items = await queryItemsFromTable<LlmConfigItem>(getConfigTableName(), {
    keyConditionExpression: "PK = :pk",
    expressionAttributeValues: {
      ":pk": SETTINGS_PK,
    },
    scanIndexForward: true,
    limit: 20,
  });

  const stored = new Map(
    items.map((item) => [item.stepKey, mapItemToSettings(item)]),
  );

  return defaults.map((fallback) => {
    return stored.get(fallback.config.stepKey) ?? fallback;
  });
};

export const getLlmStepSettings = async (
  stepKey: LlmStepKey,
): Promise<LlmStepSettings> => {
  const fallback = loadDefaultLlmStepSettings(stepKey);

  if (!hasConfigTable()) {
    return fallback;
  }

  const item = await getItemFromTable<LlmConfigItem>(getConfigTableName(), {
    PK: SETTINGS_PK,
    SK: stepSk(stepKey),
  });

  return item ? mapItemToSettings(item) : fallback;
};

export const putLlmStepSettings = async (
  settings: LlmStepSettings,
  actor: string,
): Promise<LlmStepSettings> => {
  if (!hasConfigTable()) {
    return {
      ...settings,
      updatedAt: new Date().toISOString(),
      updatedBy: actor,
    };
  }

  const updatedAt = new Date().toISOString();
  await putItemToTable(
    getConfigTableName(),
    buildItem(settings, actor, updatedAt),
  );

  return {
    ...settings,
    updatedAt,
    updatedBy: actor,
  };
};
