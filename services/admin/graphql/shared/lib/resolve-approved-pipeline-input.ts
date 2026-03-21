import { getJobExecutionByExecutionId } from "../../../../shared/lib/store/job-execution";
import type { JobMetaItem } from "../../../../shared/lib/store/video-jobs";

/**
 * 씬 JSON 생성 시 읽을 토픽 플랜 S3 키.
 * `approvedTopicExecutionId`가 있고 해당 실행이 성공·산출 키가 있으면 그것을 우선한다.
 */
export const resolveTopicS3KeyForSceneBuild = async (
  jobId: string,
  job: Pick<JobMetaItem, "approvedTopicExecutionId" | "topicS3Key">,
): Promise<{ topicS3Key: string; fromApprovedExecution: boolean } | null> => {
  const approvedId = job.approvedTopicExecutionId;
  if (approvedId) {
    const exec = await getJobExecutionByExecutionId(jobId, approvedId);
    if (exec?.status === "SUCCEEDED" && exec.outputArtifactS3Key) {
      return {
        topicS3Key: exec.outputArtifactS3Key,
        fromApprovedExecution: true,
      };
    }
  }
  if (job.topicS3Key) {
    return { topicS3Key: job.topicS3Key, fromApprovedExecution: false };
  }
  return null;
};

/**
 * 에셋 생성 시 읽을 씬 JSON S3 키.
 * `approvedSceneExecutionId`가 있고 해당 실행이 성공·산출 키가 있으면 그것을 우선한다.
 */
export const resolveSceneJsonS3KeyForAssetGeneration = async (
  jobId: string,
  job: Pick<JobMetaItem, "approvedSceneExecutionId" | "sceneJsonS3Key">,
): Promise<{
  sceneJsonS3Key: string;
  fromApprovedExecution: boolean;
} | null> => {
  const approvedId = job.approvedSceneExecutionId;
  if (approvedId) {
    const exec = await getJobExecutionByExecutionId(jobId, approvedId);
    if (exec?.status === "SUCCEEDED" && exec.outputArtifactS3Key) {
      return {
        sceneJsonS3Key: exec.outputArtifactS3Key,
        fromApprovedExecution: true,
      };
    }
  }
  if (job.sceneJsonS3Key) {
    return { sceneJsonS3Key: job.sceneJsonS3Key, fromApprovedExecution: false };
  }
  return null;
};
