import {
  type LlmProvider,
  type LlmStepSettings,
  useLlmSettingsQuery,
  useUpdateLlmStepSettingsMutation,
} from "@packages/graphql";

export type { LlmProvider, LlmStepSettings };

export const useLlmSettings = useLlmSettingsQuery;
export const useUpdateLlmStepSettings = useUpdateLlmStepSettingsMutation;

export const stepTitle = (stepKey: string): string => {
  switch (stepKey) {
    case "topic-plan":
      return "Topic Planning";
    case "scene-json":
      return "Scene JSON";
    case "metadata":
      return "Metadata Generation";
    default:
      return stepKey;
  }
};
