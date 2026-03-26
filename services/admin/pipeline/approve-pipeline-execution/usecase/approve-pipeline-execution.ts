import { listJobExecutionRows } from "../../../../shared/lib/store/job-execution";
import { updateJobMeta } from "../../../../shared/lib/store/video-jobs";
import { mapJobMetaToAdminJob } from "../../../shared/mapper/map-job-meta-to-admin-job";
import { getJobOrThrow } from "../../../shared/repo/job-draft-store";

export const approvePipelineExecutionUsecase = async (input: {
  jobId: string;
  executionId: string;
}) => {
  const rows = await listJobExecutionRows(input.jobId);
  const row = rows.find((r) => r.executionId === input.executionId);
  if (!row) {
    throw new Error("execution not found");
  }
  if (row.status !== "SUCCEEDED") {
    throw new Error("only succeeded executions can be approved");
  }
  const fields: Record<string, unknown> = {};
  if (row.stageType === "JOB_PLAN") {
    fields.approvedPlanExecutionId = input.executionId;
  } else if (row.stageType === "SCENE_JSON") {
    fields.approvedSceneExecutionId = input.executionId;
  } else if (row.stageType === "ASSET_GENERATION") {
    fields.approvedAssetExecutionId = input.executionId;
  } else {
    throw new Error("unknown pipeline stage");
  }
  await updateJobMeta(input.jobId, fields);
  const job = await getJobOrThrow(input.jobId);
  return mapJobMetaToAdminJob(job);
};
