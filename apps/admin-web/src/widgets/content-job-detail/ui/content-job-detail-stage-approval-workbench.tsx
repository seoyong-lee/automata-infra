'use client';

import { useJobExecutionsQuery, type PipelineExecution } from '@packages/graphql';
import { Badge } from '@packages/ui/badge';
import { Button } from '@packages/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import { getErrorMessage } from '@packages/utils';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const STAGE_LABEL: Record<PipelineExecution['stageType'], string> = {
  TOPIC_PLAN: '토픽 플랜',
  SCENE_JSON: '씬 JSON',
  ASSET_GENERATION: '에셋 생성',
};

function formatDurationSec(startedAt: string, completedAt?: string | null): string {
  if (!completedAt) {
    return '—';
  }
  const a = new Date(startedAt).getTime();
  const b = new Date(completedAt).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) {
    return '—';
  }
  const sec = Math.round((b - a) / 1000);
  return `${sec}s`;
}

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

  useEffect(() => {
    if (rows.length === 0) {
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) => {
      if (prev && rows.some((r) => r.executionId === prev)) {
        return prev;
      }
      return rows[0]?.executionId ?? null;
    });
  }, [rows]);

  const selected = rows.find((r) => r.executionId === selectedId) ?? null;
  const stageLabel = STAGE_LABEL[stageType];

  const canApprove =
    Boolean(selected?.executionId) &&
    selected?.status === 'SUCCEEDED' &&
    selected.executionId !== approvedExecutionId;

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Card className="lg:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">실행 후보</CardTitle>
          <CardDescription className="text-xs">
            {stageLabel} 단계 기록입니다. 성공한 실행만 채택할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-h-[min(420px,50vh)] space-y-1 overflow-y-auto">
          {q.isLoading ? <p className="text-sm text-muted-foreground">불러오는 중…</p> : null}
          {q.error ? <p className="text-sm text-destructive">{getErrorMessage(q.error)}</p> : null}
          {!q.isLoading && rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">기록이 없습니다.</p>
          ) : null}
          {rows.map((row) => (
            <button
              key={row.executionId}
              type="button"
              onClick={() => setSelectedId(row.executionId)}
              className={`w-full rounded-md border px-2 py-2 text-left text-xs transition-colors ${
                row.executionId === selectedId
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="font-normal px-0">
                  {row.status}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {formatDurationSec(row.startedAt, row.completedAt)}
                </span>
              </div>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground line-clamp-2">
                {row.executionId}
              </p>
            </button>
          ))}
        </CardContent>
      </Card>

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
              <div>
                <dt className="text-muted-foreground">executionId</dt>
                <dd className="font-mono break-all">{selected.executionId}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">상태</dt>
                <dd>
                  <Badge variant="secondary">{selected.status}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">소요</dt>
                <dd>{formatDurationSec(selected.startedAt, selected.completedAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">입력 스냅샷</dt>
                <dd className="font-mono break-all text-muted-foreground">
                  {selected.inputSnapshotId ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">산출물</dt>
                <dd className="font-mono break-all text-muted-foreground">
                  {selected.outputArtifactS3Key ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">시작 / 완료</dt>
                <dd className="text-muted-foreground">
                  {selected.startedAt}
                  <br />
                  {selected.completedAt ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">실행자</dt>
                <dd>{selected.triggeredBy ?? '—'}</dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

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
            <p className="mt-1 font-mono break-all text-foreground">
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
    </div>
  );
}
