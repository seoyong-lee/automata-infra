import { Handler } from "aws-lambda";
import { run as deleteContentPreset } from "./delete-content-preset";
import { run as listContentPresets } from "./list-content-presets";
import { run as getLlmSettings } from "./get-llm-settings";
import { run as listVoiceProfiles } from "./list-voice-profiles";
import { run as updateLlmSettings } from "./update-llm-settings";
import { run as upsertContentPreset } from "./upsert-content-preset";
import { run as upsertVoiceProfile } from "./upsert-voice-profile";
import {
  dispatchGroupedResolver,
  type GroupedResolverRoutes,
} from "../shared/grouped-router";
import { type GroupedGraphqlResolverEvent } from "../shared/graphql-event";

const routes: GroupedResolverRoutes = {
  contentPresets: listContentPresets,
  deleteContentPreset,
  llmSettings: getLlmSettings,
  updateLlmStepSettings: updateLlmSettings,
  upsertContentPreset,
  voiceProfiles: listVoiceProfiles,
  upsertVoiceProfile,
};

export const run: Handler<GroupedGraphqlResolverEvent, unknown> = async (
  event,
) => {
  return dispatchGroupedResolver(event, routes, "settings");
};
