'use client';

import { useJobExecutionsQuery, type PipelineExecution } from '@packages/graphql';
import { useMemo, useState } from 'react';

import {
  ApprovedExecutionCard,
  getSelectedExecutionId,
  getStageLabel,
  SelectedExecutionCard,
  StageExecutionListCard,
} from './content-job-detail-stage-approval-parts';

type StageApprovalWorkbenchProps = {
  jobId: string;
  stageType: PipelineExecution['stageType'];
  approvedExecutionId?: string | null;
  onApprove: (executionId: string) => void;
  isApproving: boolean;
  approveError: unknown;
};

export function ContentJobDetailStageApprovalWorkbench({
  jobId,
  stageType,
  approvedExecutionId,
  onApprove,
  isApproving,
  approveError,
}: StageApprovalWorkbenchProps) {
  const q = useJobExecutionsQuery({ jobId }, { enabled: Boolean(jobId) });
  const rows = useMemo(() => {
    const list = q.data ?? [];
    return list
      .filter((e) => e.stageType === stageType)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }, [q.data, stageType]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const effectiveSelectedId = getSelectedExecutionId(rows, selectedId);
  const selected = rows.find((row) => row.executionId === effectiveSelectedId) ?? null;
  const stageLabel = getStageLabel(stageType);

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <StageExecutionListCard
        rows={rows}
        selectedId={effectiveSelectedId}
        stageLabel={stageLabel}
        isLoading={q.isLoading}
        error={q.error}
        onSelect={setSelectedId}
      />
      <SelectedExecutionCard jobId={jobId} selected={selected} />
      <ApprovedExecutionCard
        selected={selected}
        approvedExecutionId={approvedExecutionId}
        isApproving={isApproving}
        approveError={approveError}
        onApprove={onApprove}
      />
    </div>
  );
}
