import { listJobExecutionRows } from "../../../../shared/lib/store/job-execution";
import { updateJobMeta } from "../../../../shared/lib/store/video-jobs";
import { mapJobMetaToAdminJob } from "../../../shared/mapper/map-job-meta-to-admin-job";
import { getJobOrThrow } from "../../../shared/repo/job-draft-store";
import { mapApprovedExecutionFields } from "../../shared/mapper/map-approved-execution-fields";

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
  const fields = mapApprovedExecutionFields(row.stageType, input.executionId);
  await updateJobMeta(input.jobId, fields);
  const job = await getJobOrThrow(input.jobId);
  return mapJobMetaToAdminJob(job);
};
