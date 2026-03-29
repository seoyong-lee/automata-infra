import { putJsonToS3 } from "../../../../shared/lib/aws/runtime";
import { updateJobMeta } from "../../../../shared/lib/store/video-jobs";
import { clearSceneAssets } from "../../../../script/repo/clear-scene-assets";
import { getSceneJsonKey } from "../../../../script/normalize/get-scene-json-key";
import { persistSceneAssets } from "../../../../script/repo/persist-scene-assets";
import type { SceneJson } from "../../../../../types/render/scene-json";

export const markSceneJsonBuilding = async (jobId: string) => {
  await updateJobMeta(jobId, {}, "SCENE_JSON_BUILDING");
};

export const persistGeneratedSceneJson = async (
  jobId: string,
  sceneJson: SceneJson,
): Promise<string> => {
  const sceneJsonS3Key = getSceneJsonKey(jobId);
  await putJsonToS3(sceneJsonS3Key, sceneJson);
  await clearSceneAssets(jobId);
  await persistSceneAssets(jobId, sceneJson);
  await updateJobMeta(
    jobId,
    {
      sceneJsonS3Key,
      videoTitle: sceneJson.videoTitle,
    },
    "SCENE_JSON_READY",
  );
  return sceneJsonS3Key;
};
