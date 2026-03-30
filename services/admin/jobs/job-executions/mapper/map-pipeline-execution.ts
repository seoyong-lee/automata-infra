import type { JobExecutionRow } from "../../../../shared/lib/store/job-execution";

const toNullable = <T>(value: T | null | undefined): T | null => value ?? null;

export type PipelineExecutionGql = {
  executionId: string;
  jobId: string;
  stageType: string;
  stepType: string;
  status: string;
  triggeredBy?: string | null;
  attemptCount: number;
  maxAttempts: number;
  maxRuntimeSec: number;
  startedAt: string;
  deadlineAt?: string | null;
  lastHeartbeatAt?: string | null;
  leaseExpiresAt?: string | null;
  completedAt?: string | null;
  timedOutAt?: string | null;
  errorMessage?: string | null;
  failureType?: string | null;
  failureCode?: string | null;
  retryable?: boolean | null;
  nextRetryAt?: string | null;
  inputSnapshotId?: string | null;
  outputArtifactS3Key?: string | null;
};

export const mapPipelineExecution = (
  row: JobExecutionRow,
): PipelineExecutionGql => ({
  executionId: row.executionId,
  jobId: row.jobId,
  stageType: row.stageType,
  stepType: row.stepType,
  status: row.status,
  triggeredBy: toNullable(row.triggeredBy),
  attemptCount: row.attemptCount,
  maxAttempts: row.maxAttempts,
  maxRuntimeSec: row.maxRuntimeSec,
  startedAt: row.startedAt,
  deadlineAt: toNullable(row.deadlineAt),
  lastHeartbeatAt: toNullable(row.lastHeartbeatAt),
  leaseExpiresAt: toNullable(row.leaseExpiresAt),
  completedAt: toNullable(row.completedAt),
  timedOutAt: toNullable(row.timedOutAt),
  errorMessage: toNullable(row.errorMessage),
  failureType: toNullable(row.failureType),
  failureCode: toNullable(row.failureCode),
  retryable: toNullable(row.retryable),
  nextRetryAt: toNullable(row.nextRetryAt),
  inputSnapshotId: toNullable(row.inputSnapshotId),
  outputArtifactS3Key: toNullable(row.outputArtifactS3Key),
});
