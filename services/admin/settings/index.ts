import { Handler } from "aws-lambda";
import { run as listContentPresets } from "./list-content-presets";
import { run as getLlmSettings } from "./get-llm-settings";
import { run as listVoiceProfiles } from "./list-voice-profiles";
import { run as updateLlmSettings } from "./update-llm-settings";
import { run as upsertContentPreset } from "./upsert-content-preset";
import { run as upsertVoiceProfile } from "./upsert-voice-profile";
import {
  getGroupedFieldName,
  GroupedGraphqlResolverEvent,
} from "../shared/graphql-event";

const handlers: Record<
  string,
  Handler<GroupedGraphqlResolverEvent, unknown>
> = {
  contentPresets: listContentPresets,
  llmSettings: getLlmSettings,
  updateLlmStepSettings: updateLlmSettings,
  upsertContentPreset,
  voiceProfiles: listVoiceProfiles,
  upsertVoiceProfile,
};

export const run: Handler<GroupedGraphqlResolverEvent, unknown> = async (
  event,
) => {
  const fieldName = getGroupedFieldName(event);
  const handler = handlers[fieldName];
  if (!handler) {
    throw new Error(`Unsupported settings resolver: ${fieldName}`);
  }
  return handler(event, {} as never, () => undefined);
};
