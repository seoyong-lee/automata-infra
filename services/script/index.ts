import { Handler } from "aws-lambda";
import { getSceneJsonKey } from "./normalize/get-scene-json-key";
import { persistSceneAssets } from "./repo/persist-scene-assets";
import { persistSceneJson } from "./repo/persist-scene-json";
import { buildSceneJson, SceneJsonResult } from "./usecase/build-scene-json";
import { JobPlanResult } from "../plan/usecase/create-job-plan";

export const run: Handler<JobPlanResult, SceneJsonResult> = async (event) => {
  const sceneJson = await buildSceneJson(event);
  const sceneJsonS3Key = getSceneJsonKey(event.jobId);
  await persistSceneJson({
    jobId: event.jobId,
    sceneJsonS3Key,
    sceneJson,
  });
  await persistSceneAssets(event.jobId, sceneJson);

  return {
    ...event,
    status: "SCENE_JSON_READY",
    sceneJsonS3Key,
    sceneJson,
  };
};
