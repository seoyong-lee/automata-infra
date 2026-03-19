import type { PromptVariables } from "./types";

const stringifyValue = (value: PromptVariables[string]): string => {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value);
};

export const renderPrompt = (
  template: string,
  variables: PromptVariables,
): string => {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
    return stringifyValue(variables[key]);
  });
};
