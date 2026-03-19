import { Handler } from "aws-lambda";
import { getSceneJsonKey } from "./normalize/get-scene-json-key";
import { persistSceneAssets } from "./repo/persist-scene-assets";
import { persistSceneJson } from "./repo/persist-scene-json";
import { buildSceneJson, SceneJsonResult } from "./usecase/build-scene-json";
import { TopicPlanResult } from "../topic/usecase/create-topic-plan";

export const run: Handler<TopicPlanResult, SceneJsonResult> = async (event) => {
  const sceneJson = buildSceneJson(event);
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
