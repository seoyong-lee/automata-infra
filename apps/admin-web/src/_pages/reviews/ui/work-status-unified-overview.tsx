'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import { getErrorMessage } from '@packages/utils';
import Link from 'next/link';
import { useMemo } from 'react';

import { useAdminJobs, usePendingReviews } from '@/entities/admin-job';

export function WorkStatusUnifiedOverview() {
  const jobsQuery = useAdminJobs({ limit: 500 });
  const pendingQuery = usePendingReviews({ limit: 100 });

  const snapshot = useMemo(() => {
    const jobs = jobsQuery.data?.items ?? [];
    const pending = pendingQuery.data?.items ?? [];
    const counts = jobs.reduce<Record<string, number>>((acc, job) => {
      acc[job.status] = (acc[job.status] ?? 0) + 1;
      return acc;
    }, {});
    return {
      total: jobs.length,
      reviewPending: counts.REVIEW_PENDING ?? 0,
      assetGen: counts.ASSET_GENERATING ?? 0,
      failed: counts.FAILED ?? 0,
      uploaded: counts.UPLOADED ?? 0,
      pendingQueue: pending.length,
    };
  }, [jobsQuery.data?.items, pendingQuery.data?.items]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>전체 작업 통합 현황</CardTitle>
        <CardDescription>
          등록된 모든 채널·제작 아이템 작업을 한 화면에서 집계합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {jobsQuery.error ? (
          <p className="text-sm text-destructive">{getErrorMessage(jobsQuery.error)}</p>
        ) : null}
        {pendingQuery.error ? (
          <p className="text-sm text-destructive">{getErrorMessage(pendingQuery.error)}</p>
        ) : null}
        {jobsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">불러오는 중입니다…</p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            { label: '전체 제작 아이템', value: snapshot.total },
            { label: '검수 대기(상태)', value: snapshot.reviewPending },
            { label: '검수 큐(할당)', value: snapshot.pendingQueue },
            { label: '에셋 생성 중', value: snapshot.assetGen },
            { label: '실패', value: snapshot.failed },
            { label: '업로드 완료', value: snapshot.uploaded },
          ].map((m) => (
            <div key={m.label} className="rounded-lg border border-border/80 p-4">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{m.value}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          채널별 편집·제작은{' '}
          <Link href="/content" className="font-medium text-primary hover:underline">
            채널
          </Link>
          로 이동하거나, 하단 목록에서 행을 선택해 채널 상세로 들어갑니다.
        </p>
      </CardContent>
    </Card>
  );
}
