import { putJsonToS3 } from "../../../../shared/lib/aws/runtime";
import { normalizeSceneJson } from "../../../../shared/lib/scene-json-normalization";
import { updateJobMeta } from "../../../../shared/lib/store/video-jobs";
import { clearSceneAssets } from "../../../../script/repo/clear-scene-assets";
import { persistSceneAssets } from "../../../../script/repo/persist-scene-assets";
import { getSceneJsonKey } from "../../../../script/normalize/get-scene-json-key";
import { getJobDraftView } from "../../../shared/usecase/get-job-draft-view";
import type { SceneJson } from "../../../../../types/render/scene-json";

export const updateAdminSceneJson = async (input: {
  jobId: string;
  sceneJson: SceneJson;
}) => {
  const normalizedSceneJson = normalizeSceneJson(input.sceneJson);
  const sceneJsonS3Key = getSceneJsonKey(input.jobId);
  await putJsonToS3(sceneJsonS3Key, normalizedSceneJson);
  await clearSceneAssets(input.jobId);
  await persistSceneAssets(input.jobId, normalizedSceneJson);
  await updateJobMeta(
    input.jobId,
    {
      sceneJsonS3Key,
      videoTitle: normalizedSceneJson.videoTitle,
    },
    "SCENE_JSON_READY",
  );
  return getJobDraftView(input.jobId);
};
