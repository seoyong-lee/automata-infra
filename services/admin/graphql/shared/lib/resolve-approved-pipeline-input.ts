import { getJobExecutionByExecutionId } from "../../../../shared/lib/store/job-execution";
import type { JobMetaItem } from "../../../../shared/lib/store/video-jobs";

/**
 * 씬 JSON 생성 시 읽을 job plan S3 키.
 * `approvedPlanExecutionId`가 있고 해당 실행이 성공·산출 키가 있으면 그것을 우선한다.
 */
export const resolveJobPlanS3KeyForSceneBuild = async (
  jobId: string,
  job: Pick<JobMetaItem, "approvedPlanExecutionId" | "jobPlanS3Key">,
): Promise<{ jobPlanS3Key: string; fromApprovedExecution: boolean } | null> => {
  const approvedId = job.approvedPlanExecutionId;
  if (approvedId) {
    const exec = await getJobExecutionByExecutionId(jobId, approvedId);
    if (exec?.status === "SUCCEEDED" && exec.outputArtifactS3Key) {
      return {
        jobPlanS3Key: exec.outputArtifactS3Key,
        fromApprovedExecution: true,
      };
    }
  }
  if (job.jobPlanS3Key) {
    return { jobPlanS3Key: job.jobPlanS3Key, fromApprovedExecution: false };
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
