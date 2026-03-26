import type { JobExecutionRow } from "../../../../shared/lib/store/job-execution";

export type PipelineExecutionGql = {
  executionId: string;
  jobId: string;
  stageType: string;
  status: string;
  triggeredBy?: string | null;
  startedAt: string;
  completedAt?: string | null;
  errorMessage?: string | null;
  inputSnapshotId?: string | null;
  outputArtifactS3Key?: string | null;
};

export const mapPipelineExecution = (
  row: JobExecutionRow,
): PipelineExecutionGql => ({
  executionId: row.executionId,
  jobId: row.jobId,
  stageType: row.stageType,
  status: row.status,
  triggeredBy: row.triggeredBy ?? null,
  startedAt: row.startedAt,
  completedAt: row.completedAt ?? null,
  errorMessage: row.errorMessage ?? null,
  inputSnapshotId: row.inputSnapshotId ?? null,
  outputArtifactS3Key: row.outputArtifactS3Key ?? null,
});
