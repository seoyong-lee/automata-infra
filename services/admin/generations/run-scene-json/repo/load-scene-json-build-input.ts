import { getJsonFromS3 } from "../../../../shared/lib/aws/runtime";
import { resolveJobPlanS3KeyForSceneBuild } from "../../../shared/lib/resolve-approved-pipeline-input";
import {
  getJobOrThrow,
  getStoredJobBrief,
} from "../../../shared/repo/job-draft-store";
import { mergeSceneJsonInput } from "../normalize/merge-scene-json-input";
import type { JobPlanResult } from "../../../../plan/usecase/create-job-plan";

const resolveSceneJsonPlanInput = async (jobId: string) => {
  const job = await getJobOrThrow(jobId);
  const planResolved = await resolveJobPlanS3KeyForSceneBuild(jobId, job);
  if (!planResolved) {
    throw new Error("job plan not found");
  }
  return {
    job,
    inputSnapshotId: planResolved.jobPlanS3Key,
  };
};

export const resolveSceneJsonInputSnapshotId = async (
  jobId: string,
): Promise<string> => {
  const resolved = await resolveSceneJsonPlanInput(jobId);
  return resolved.inputSnapshotId;
};

export const loadSceneJsonBuildInput = async (jobId: string) => {
  const resolved = await resolveSceneJsonPlanInput(jobId);
  const jobPlan = await getJsonFromS3<JobPlanResult>(resolved.inputSnapshotId);
  if (!jobPlan) {
    throw new Error("job plan payload not found");
  }

  const jobBrief = await getStoredJobBrief(resolved.job);
  return {
    inputSnapshotId: resolved.inputSnapshotId,
    sceneJsonInput: mergeSceneJsonInput(jobPlan, jobBrief),
  };
};
