import { Handler } from "aws-lambda";
import { run as runAssetGeneration } from "./run-asset-generation";
import { run as runJobPlan } from "./run-job-plan";
import { run as runSceneJson } from "./run-scene-json";
import { run as selectSceneImageCandidate } from "./select-scene-image-candidate";
import { run as selectSceneVoiceCandidate } from "./select-scene-voice-candidate";
import { run as setJobBackgroundMusic } from "./set-job-background-music";
import { run as setJobDefaultVoiceProfile } from "./set-job-default-voice-profile";
import { run as setSceneVoiceProfile } from "./set-scene-voice-profile";
import { run as updateSceneJson } from "./update-scene-json";
import {
  getGroupedFieldName,
  GroupedGraphqlResolverEvent,
} from "../shared/graphql-event";

const handlers: Record<
  string,
  Handler<GroupedGraphqlResolverEvent, unknown>
> = {
  runJobPlan,
  runSceneJson,
  updateSceneJson,
  runAssetGeneration,
  selectSceneImageCandidate,
  selectSceneVoiceCandidate,
  setJobDefaultVoiceProfile,
  setJobBackgroundMusic,
  setSceneVoiceProfile,
};

export const run: Handler<GroupedGraphqlResolverEvent, unknown> = async (
  event,
) => {
  const fieldName = getGroupedFieldName(event);
  const handler = handlers[fieldName];
  if (!handler) {
    throw new Error(`Unsupported generations resolver: ${fieldName}`);
  }
  return handler(event, {} as never, () => undefined);
};
