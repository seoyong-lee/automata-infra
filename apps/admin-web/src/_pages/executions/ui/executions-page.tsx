'use client';

import { fetchJobExecutions, useAdminJobsQuery, type PipelineExecution } from '@packages/graphql';
import { Badge } from '@packages/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import { getErrorMessage } from '@packages/utils';
import { useQueries } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo } from 'react';

import { AdminPageHeader } from '@/shared/ui/admin-page-header';

const rowBtn =
  'inline-flex h-8 items-center justify-center rounded-md border border-border bg-transparent px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground';

function formatDuration(startedAt: string, completedAt?: string | null): string {
  if (!completedAt) {
    return '—';
  }
  const a = new Date(startedAt).getTime();
  const b = new Date(completedAt).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) {
    return '—';
  }
  return `${Math.round((b - a) / 1000)}s`;
}

/** 전역 실행 전용 API가 없을 때, 최근 제작 아이템 N개의 jobExecutions를 병렬로 모읍니다. */
const MAX_JOBS_FOR_EXECUTION_FEED = 25;
const MAX_EXECUTION_ROWS = 80;

type ExecutionFeedRow = PipelineExecution & {
  videoTitle: string;
};

export function ExecutionsPage() {
  const q = useAdminJobsQuery({ limit: 200 });

  const items = useMemo(() => {
    const list = q.data?.items ?? [];
    return [...list].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [q.data?.items]);

  const topJobIds = useMemo(
    () => items.slice(0, MAX_JOBS_FOR_EXECUTION_FEED).map((j) => j.jobId),
    [items],
  );

  const jobById = useMemo(() => {
    const m: Record<string, (typeof items)[number]> = {};
    for (const j of items) {
      m[j.jobId] = j;
    }
    return m;
  }, [items]);

  const execQueries = useQueries({
    queries: topJobIds.map((jobId) => ({
      queryKey: ['jobExecutions', jobId] as const,
      queryFn: () => fetchJobExecutions(jobId),
      enabled: Boolean(jobId) && topJobIds.length > 0 && !q.isLoading && !q.isError,
      staleTime: 30_000,
    })),
  });

  const executionFeed = useMemo((): ExecutionFeedRow[] => {
    const rows: ExecutionFeedRow[] = [];
    for (let i = 0; i < execQueries.length; i++) {
      const jobId = topJobIds[i];
      const job = jobById[jobId];
      const title = job?.videoTitle?.trim() || jobId;
      const execs = execQueries[i]?.data ?? [];
      for (const e of execs) {
        rows.push({ ...e, videoTitle: title });
      }
    }
    rows.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    return rows.slice(0, MAX_EXECUTION_ROWS);
  }, [execQueries, topJobIds, jobById]);

  const executionsLoading =
    topJobIds.length > 0 && execQueries.some((r) => r.isLoading || r.isPending);
  const executionsError = execQueries.find((r) => r.error)?.error;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="실행 모니터링"
        subtitle="최근 제작 아이템과 파이프라인 실행(토픽·씬·에셋)을 한곳에서 들어갑니다. 실행(Execution)은 승인·채택(Approval)과 별개입니다."
      />

      <Card>
        <CardHeader>
          <CardTitle>최근 파이프라인 실행</CardTitle>
          <CardDescription>
            최근 갱신 순 제작 아이템 <strong>{topJobIds.length}</strong>개에 대해{' '}
            <code className="text-xs">jobExecutions</code>를 합친 뷰입니다(최대 {MAX_EXECUTION_ROWS}
            행). 전역 단일 조회·필터는 추후 API로 보강합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {q.isLoading ? <p className="text-sm text-muted-foreground">불러오는 중…</p> : null}
          {q.error ? <p className="text-sm text-destructive">{getErrorMessage(q.error)}</p> : null}
          {executionsLoading ? (
            <p className="text-sm text-muted-foreground">실행 이력을 모으는 중…</p>
          ) : null}
          {executionsError ? (
            <p className="text-sm text-destructive">{getErrorMessage(executionsError)}</p>
          ) : null}
          {!executionsLoading && topJobIds.length === 0 ? (
            <p className="text-sm text-muted-foreground">표시할 제작 아이템이 없습니다.</p>
          ) : null}
          {!executionsLoading && topJobIds.length > 0 && executionFeed.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              선택한 제작 아이템에 기록된 파이프라인 실행이 아직 없습니다.
            </p>
          ) : null}
          {executionFeed.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-medium">제작 아이템</th>
                    <th className="px-3 py-2 font-medium">단계</th>
                    <th className="px-3 py-2 font-medium">상태</th>
                    <th className="px-3 py-2 font-medium">입력 스냅샷</th>
                    <th className="px-3 py-2 font-medium">시작</th>
                    <th className="px-3 py-2 font-medium">완료</th>
                    <th className="px-3 py-2 font-medium">실행자</th>
                  </tr>
                </thead>
                <tbody>
                  {executionFeed.map((row) => (
                    <tr key={row.executionId} className="border-b border-border/60">
                      <td className="px-3 py-2">
                        <Link
                          href={`/jobs/${row.jobId}/timeline`}
                          className="font-medium text-foreground underline-offset-4 hover:underline"
                        >
                          {row.videoTitle}
                        </Link>
                        <p className="font-mono text-[11px] text-muted-foreground">{row.jobId}</p>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{row.stageType}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline">{row.status}</Badge>
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                        {row.inputSnapshotId ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{row.startedAt}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {row.completedAt ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-xs">{row.triggeredBy ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>제작 아이템 바로가기</CardTitle>
          <CardDescription>
            전체 <strong>{items.length}</strong>건 (최대 200건 조회). 목록은 최근 갱신 순입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {q.isLoading ? <p className="text-sm text-muted-foreground">불러오는 중…</p> : null}
          {q.error ? <p className="text-sm text-destructive">{getErrorMessage(q.error)}</p> : null}
          <ul className="divide-y rounded-md border">
            {items.map((j) => (
              <li
                key={j.jobId}
                className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm max-md:flex-col max-md:items-stretch"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{j.videoTitle || j.jobId}</p>
                  <p className="font-mono text-xs text-muted-foreground">{j.jobId}</p>
                </div>
                <Badge variant="outline">{j.status}</Badge>
                <span className="text-xs text-muted-foreground">
                  갱신 {new Date(j.updatedAt).toLocaleString()}
                </span>
                <Link href={`/jobs/${j.jobId}/timeline`} className={`${rowBtn} shrink-0`}>
                  실행 이력
                </Link>
                <Link href={`/jobs/${j.jobId}/overview`} className={`${rowBtn} shrink-0`}>
                  제작 아이템
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
