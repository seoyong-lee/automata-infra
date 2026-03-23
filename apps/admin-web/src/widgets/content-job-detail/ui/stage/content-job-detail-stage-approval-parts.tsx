'use client';

import type { PipelineExecution } from '@packages/graphql';
import { Badge } from '@packages/ui/badge';
import { Button } from '@packages/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import { getErrorMessage } from '@packages/utils';
import Link from 'next/link';
import type { ReactNode } from 'react';

const STAGE_LABEL: Record<PipelineExecution['stageType'], string> = {
  TOPIC_PLAN: '토픽 플랜',
  SCENE_JSON: '씬 JSON',
  ASSET_GENERATION: '에셋 생성',
  FINAL_COMPOSITION: '최종 렌더',
};

export function getSelectedExecutionId(
  rows: PipelineExecution[],
  selectedId: string | null,
): string | null {
  if (selectedId && rows.some((row) => row.executionId === selectedId)) {
    return selectedId;
  }
  return rows[0]?.executionId ?? null;
}

export function getStageLabel(stageType: PipelineExecution['stageType']) {
  return STAGE_LABEL[stageType];
}

export function formatExecutionDuration(startedAt: string, completedAt?: string | null): string {
  if (!completedAt) {
    return '—';
  }
  const started = new Date(startedAt).getTime();
  const completed = new Date(completedAt).getTime();
  if (Number.isNaN(started) || Number.isNaN(completed) || completed < started) {
    return '—';
  }
  return `${Math.round((completed - started) / 1000)}s`;
}

export function StageExecutionListCard({
  rows,
  selectedId,
  stageLabel,
  isLoading,
  error,
  onSelect,
}: {
  rows: PipelineExecution[];
  selectedId: string | null;
  stageLabel: string;
  isLoading: boolean;
  error: unknown;
  onSelect: (executionId: string) => void;
}) {
  return (
    <Card className="lg:col-span-3">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">실행 후보</CardTitle>
        <CardDescription className="text-xs">
          {stageLabel} 단계 기록입니다. 성공한 실행만 채택할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="max-h-[min(420px,50vh)] space-y-1 overflow-y-auto">
        {isLoading ? <p className="text-sm text-muted-foreground">불러오는 중…</p> : null}
        {error ? <p className="text-sm text-destructive">{getErrorMessage(error)}</p> : null}
        {!isLoading && rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">기록이 없습니다.</p>
        ) : null}
        {rows.map((row) => (
          <button
            key={row.executionId}
            type="button"
            onClick={() => onSelect(row.executionId)}
            className={`w-full rounded-md border px-2 py-2 text-left text-xs transition-colors ${
              row.executionId === selectedId
                ? 'border-primary bg-primary/10'
                : 'border-border hover:bg-muted/50'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline" className="px-2 font-normal">
                {row.status}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {formatExecutionDuration(row.startedAt, row.completedAt)}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 font-mono text-[10px] text-muted-foreground">
              {row.executionId}
            </p>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

export function SelectedExecutionCard({
  jobId,
  selected,
}: {
  jobId: string;
  selected: PipelineExecution | null;
}) {
  return (
    <Card className="lg:col-span-5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">선택한 실행</CardTitle>
        <CardDescription className="text-xs">
          입력·산출 S3 키로 재현성을 추적합니다. 전체 타임라인은{' '}
          <Link href={`/jobs/${jobId}/timeline`} className="text-foreground underline">
            실행 이력
          </Link>
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {!selected ? (
          <p className="text-muted-foreground">선택된 실행이 없습니다.</p>
        ) : (
          <dl className="space-y-2 text-xs">
            <ExecutionDetail label="executionId" value={selected.executionId} mono />
            <ExecutionDetail
              label="상태"
              value={<Badge variant="secondary">{selected.status}</Badge>}
            />
            <ExecutionDetail
              label="소요"
              value={formatExecutionDuration(selected.startedAt, selected.completedAt)}
            />
            <ExecutionDetail
              label="입력 스냅샷"
              value={selected.inputSnapshotId ?? '—'}
              mono
              muted
            />
            <ExecutionDetail
              label="산출물"
              value={selected.outputArtifactS3Key ?? '—'}
              mono
              muted
            />
            <ExecutionDetail
              label="시작 / 완료"
              value={
                <>
                  {selected.startedAt}
                  <br />
                  {selected.completedAt ?? '—'}
                </>
              }
              muted
            />
            <ExecutionDetail label="실행자" value={selected.triggeredBy ?? '—'} />
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

export function ApprovedExecutionCard({
  selected,
  approvedExecutionId,
  isApproving,
  approveError,
  onApprove,
}: {
  selected: PipelineExecution | null;
  approvedExecutionId?: string | null;
  isApproving: boolean;
  approveError: unknown;
  onApprove: (executionId: string) => void;
}) {
  const canApprove =
    Boolean(selected?.executionId) &&
    selected?.status === 'SUCCEEDED' &&
    selected.executionId !== approvedExecutionId;

  return (
    <Card className="lg:col-span-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">채택본 (승인 라인)</CardTitle>
        <CardDescription className="text-xs">
          문서 기준: 자동화·다음 단계는 채택된 스냅샷을 입력으로 삼아야 합니다. 지금은 메타에 실행
          ID를 기록합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="rounded-md border bg-muted/30 p-3 text-xs">
          <p className="text-muted-foreground">현재 채택 executionId</p>
          <p className="mt-1 break-all font-mono text-foreground">
            {approvedExecutionId ?? '— (미지정)'}
          </p>
        </div>
        <Button
          type="button"
          disabled={!canApprove || isApproving}
          onClick={() => {
            if (selected?.executionId && selected.status === 'SUCCEEDED') {
              onApprove(selected.executionId);
            }
          }}
        >
          {isApproving ? '채택 처리 중…' : '이 실행을 채택'}
        </Button>
        {!selected ? (
          <p className="text-xs text-muted-foreground">채택할 실행을 왼쪽에서 선택하세요.</p>
        ) : null}
        {selected && selected.status !== 'SUCCEEDED' ? (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            성공(SUCCEEDED)한 실행만 채택할 수 있습니다.
          </p>
        ) : null}
        {selected && selected.executionId === approvedExecutionId ? (
          <p className="text-xs text-muted-foreground">
            이미 이 실행이 채택으로 기록되어 있습니다.
          </p>
        ) : null}
        {approveError ? (
          <p className="text-sm text-destructive">{getErrorMessage(approveError)}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ExecutionDetail({
  label,
  value,
  mono = false,
  muted = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  muted?: boolean;
}) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={`${mono ? 'font-mono break-all' : ''} ${muted ? 'text-muted-foreground' : ''}`}
      >
        {value}
      </dd>
    </div>
  );
}
