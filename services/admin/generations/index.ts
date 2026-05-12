import { Handler } from "aws-lambda";
import { run as runAssetGeneration } from "./run-asset-generation";
import { run as runJobPlan } from "./run-job-plan";
import { run as runSceneJson } from "./run-scene-json";
import { run as searchSceneStockAssets } from "./search-scene-stock-assets";
import { run as selectSceneImageCandidate } from "./select-scene-image-candidate";
import { run as clearSceneVideo } from "./clear-scene-video";
import { run as selectSceneVideoCandidate } from "./select-scene-video-candidate";
import { run as selectSceneVoiceCandidate } from "./select-scene-voice-candidate";
import { run as setJobBackgroundMusic } from "./set-job-background-music";
import { run as setJobMasterVideo } from "./set-job-master-video";
import { run as runSourceVideoFrameExtract } from "./run-source-video-frame-extract";
import { run as runSourceVideoSceneJson } from "./run-source-video-scene-json";
import { run as setJobDefaultVoiceProfile } from "./set-job-default-voice-profile";
import { run as setSceneVoiceProfile } from "./set-scene-voice-profile";
import { run as updateSceneJson } from "./update-scene-json";
import {
  dispatchGroupedResolver,
  type GroupedResolverRoutes,
} from "../shared/grouped-router";
import { type GroupedGraphqlResolverEvent } from "../shared/graphql-event";

const routes: GroupedResolverRoutes = {
  runJobPlan,
  runSceneJson,
  updateSceneJson,
  runAssetGeneration,
  searchSceneStockAssets,
  selectSceneImageCandidate,
  selectSceneVideoCandidate,
  clearSceneVideo,
  selectSceneVoiceCandidate,
  setJobDefaultVoiceProfile,
  setJobBackgroundMusic,
  setJobMasterVideo,
  runSourceVideoFrameExtract,
  runSourceVideoSceneJson,
  setSceneVoiceProfile,
};

export const run: Handler<GroupedGraphqlResolverEvent, unknown> = async (
  event,
) => {
  return dispatchGroupedResolver(event, routes, "generations");
};
