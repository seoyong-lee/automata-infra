import { putJsonToS3 } from "../../shared/lib/aws/runtime";
import { updateJobMeta } from "../../shared/lib/store/video-jobs";
import { SceneJson } from "../../../types/render/scene-json";

export const persistSceneJson = async (input: {
  jobId: string;
  sceneJsonS3Key: string;
  sceneJson: SceneJson;
}): Promise<void> => {
  await putJsonToS3(input.sceneJsonS3Key, input.sceneJson);
  await updateJobMeta(
    input.jobId,
    {
      sceneJsonS3Key: input.sceneJsonS3Key,
      videoTitle: input.sceneJson.videoTitle,
    },
    "SCENE_JSON_READY",
  );
};
