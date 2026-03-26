import { putJsonToS3 } from "../../../../shared/lib/aws/runtime";
import { updateJobMeta } from "../../../../shared/lib/store/video-jobs";
import { clearSceneAssets } from "../../../../script/repo/clear-scene-assets";
import { persistSceneAssets } from "../../../../script/repo/persist-scene-assets";
import { getSceneJsonKey } from "../../../../script/normalize/get-scene-json-key";
import { getJobDraft } from "../../../jobs/get-job-draft/repo/get-job-draft";
import type { SceneJson } from "../../../../../types/render/scene-json";

export const updateAdminSceneJson = async (input: {
  jobId: string;
  sceneJson: SceneJson;
}) => {
  const sceneJsonS3Key = getSceneJsonKey(input.jobId);
  await putJsonToS3(sceneJsonS3Key, input.sceneJson);
  await clearSceneAssets(input.jobId);
  await persistSceneAssets(input.jobId, input.sceneJson);
  await updateJobMeta(
    input.jobId,
    {
      sceneJsonS3Key,
      videoTitle: input.sceneJson.videoTitle,
    },
    "SCENE_JSON_READY",
  );
  return getJobDraft(input.jobId);
};
