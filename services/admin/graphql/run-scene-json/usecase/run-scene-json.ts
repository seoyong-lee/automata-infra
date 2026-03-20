import { getJsonFromS3, putJsonToS3 } from "../../../../shared/lib/aws/runtime";
import { getJobOrThrow } from "../../shared/repo/job-draft-store";
import { mapJobMetaToAdminJob } from "../../shared/mapper/map-job-meta-to-admin-job";
import { updateJobMeta } from "../../../../shared/lib/store/video-jobs";
import { buildSceneJson } from "../../../../script/usecase/build-scene-json";
import type { TopicPlanResult } from "../../../../topic/usecase/create-topic-plan";
import { getSceneJsonKey } from "../../../../script/normalize/get-scene-json-key";
import { persistSceneAssets } from "../../../../script/repo/persist-scene-assets";

export const runAdminSceneJson = async (jobId: string) => {
  const job = await getJobOrThrow(jobId);
  if (!job.topicS3Key) {
    throw new Error("topic plan not found");
  }

  const topicPlan = await getJsonFromS3<TopicPlanResult>(job.topicS3Key);
  if (!topicPlan) {
    throw new Error("topic plan payload not found");
  }

  await updateJobMeta(jobId, {}, "SCENE_JSON_BUILDING");
  const sceneJson = await buildSceneJson(topicPlan);
  const sceneJsonS3Key = getSceneJsonKey(jobId);
  await putJsonToS3(sceneJsonS3Key, sceneJson);
  await persistSceneAssets(jobId, sceneJson);
  await updateJobMeta(
    jobId,
    {
      sceneJsonS3Key,
      videoTitle: sceneJson.videoTitle,
    },
    "SCENE_JSON_READY",
  );

  const updated = await getJobOrThrow(jobId);
  return mapJobMetaToAdminJob(updated);
};
