import type { JobMetaItem } from "../../../shared/lib/store/video-jobs";

/**
 * 현재 수동 워크플로우에서는 승인 여부와 무관하게 job 메타의 최신 플랜 키를 사용한다.
 */
export const resolveJobPlanS3KeyForSceneBuild = async (
  _jobId: string,
  job: Pick<JobMetaItem, "approvedPlanExecutionId" | "jobPlanS3Key">,
): Promise<{ jobPlanS3Key: string; fromApprovedExecution: boolean } | null> => {
  if (job.jobPlanS3Key) {
    return { jobPlanS3Key: job.jobPlanS3Key, fromApprovedExecution: false };
  }
  return null;
};

/**
 * 현재 수동 워크플로우에서는 승인 여부와 무관하게 job 메타의 최신 씬 JSON 키를 사용한다.
 */
export const resolveSceneJsonS3KeyForAssetGeneration = async (
  _jobId: string,
  job: Pick<JobMetaItem, "approvedSceneExecutionId" | "sceneJsonS3Key">,
): Promise<{
  sceneJsonS3Key: string;
  fromApprovedExecution: boolean;
} | null> => {
  if (job.sceneJsonS3Key) {
    return { sceneJsonS3Key: job.sceneJsonS3Key, fromApprovedExecution: false };
  }
  return null;
};
