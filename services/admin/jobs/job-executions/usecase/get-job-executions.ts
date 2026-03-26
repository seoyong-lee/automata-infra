import { listJobExecutionRows } from "../../../../shared/lib/store/job-execution";
import { mapPipelineExecution } from "../mapper/map-pipeline-execution";

export const getAdminJobExecutions = async (jobId: string) => {
  const rows = await listJobExecutionRows(jobId);
  return rows.map(mapPipelineExecution);
};
