'use client';

import { useAdminJobsQuery } from '@packages/graphql';
import { Badge } from '@packages/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import { getErrorMessage } from '@packages/utils';
import Link from 'next/link';
import { useMemo } from 'react';

import { AdminPageHeader } from '@/shared/ui/admin-page-header';

const rowBtn =
  'inline-flex h-8 items-center justify-center rounded-md border border-border bg-transparent px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground';

export function ExecutionsPage() {
  const q = useAdminJobsQuery({ limit: 200 });

  const items = useMemo(() => {
    const list = q.data?.items ?? [];
    return [...list].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [q.data?.items]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="실행 현황"
        subtitle="최근 갱신 순 제작 아이템 목록입니다. 상세에서 단계·실행 이력·렌더·업로드를 이어갑니다."
      />

      <Card>
        <CardHeader>
          <CardTitle>파이프라인 스냅샷</CardTitle>
          <CardDescription>
            전체 <strong>{items.length}</strong>건 (최대 200건 조회). 필터·집계는 추후 보강합니다.
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
