import {
  getJobExecutionByExecutionId,
  type JobExecutionStageType,
} from "../../../shared/lib/store/job-execution";
import type { JobMetaItem } from "../../../shared/lib/store/video-jobs";

const resolveApprovedOutputArtifactS3Key = async (input: {
  jobId: string;
  approvedExecutionId?: string;
  expectedStage: JobExecutionStageType;
  fallbackS3Key?: string;
  artifactLabel: string;
}): Promise<{
  artifactS3Key: string;
  fromApprovedExecution: boolean;
} | null> => {
  const approvedExecutionId = input.approvedExecutionId?.trim();
  if (!approvedExecutionId) {
    const fallbackS3Key = input.fallbackS3Key?.trim();
    return fallbackS3Key
      ? {
          artifactS3Key: fallbackS3Key,
          fromApprovedExecution: false,
        }
      : null;
  }

  const row = await getJobExecutionByExecutionId(
    input.jobId,
    approvedExecutionId,
  );
  if (!row) {
    throw new Error(`approved ${input.artifactLabel} execution not found`);
  }
  if (row.stageType !== input.expectedStage) {
    throw new Error(
      `approved ${input.artifactLabel} execution has invalid stage`,
    );
  }
  const artifactS3Key = row.outputArtifactS3Key?.trim();
  if (!artifactS3Key) {
    throw new Error(`approved ${input.artifactLabel} artifact not found`);
  }
  return {
    artifactS3Key,
    fromApprovedExecution: true,
  };
};

export const resolveJobPlanS3KeyForSceneBuild = async (
  jobId: string,
  job: Pick<JobMetaItem, "approvedPlanExecutionId" | "jobPlanS3Key">,
): Promise<{ jobPlanS3Key: string; fromApprovedExecution: boolean } | null> => {
  const resolved = await resolveApprovedOutputArtifactS3Key({
    jobId,
    approvedExecutionId: job.approvedPlanExecutionId,
    expectedStage: "JOB_PLAN",
    fallbackS3Key: job.jobPlanS3Key,
    artifactLabel: "job plan",
  });
  return resolved
    ? {
        jobPlanS3Key: resolved.artifactS3Key,
        fromApprovedExecution: resolved.fromApprovedExecution,
      }
    : null;
};

export const resolveSceneJsonS3KeyForAssetGeneration = async (
  jobId: string,
  job: Pick<JobMetaItem, "approvedSceneExecutionId" | "sceneJsonS3Key">,
): Promise<{
  sceneJsonS3Key: string;
  fromApprovedExecution: boolean;
} | null> => {
  const resolved = await resolveApprovedOutputArtifactS3Key({
    jobId,
    approvedExecutionId: job.approvedSceneExecutionId,
    expectedStage: "SCENE_JSON",
    fallbackS3Key: job.sceneJsonS3Key,
    artifactLabel: "scene json",
  });
  return resolved
    ? {
        sceneJsonS3Key: resolved.artifactS3Key,
        fromApprovedExecution: resolved.fromApprovedExecution,
      }
    : null;
};
