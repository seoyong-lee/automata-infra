'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import Link from 'next/link';

import { formatJobTimestamp } from '../../lib/format-job-timestamp';
import type { JobDraftDetail } from '../../model';

type Props = {
  jobId: string;
  detail?: JobDraftDetail;
};

export function ContentJobDetailOverviewRecentCard({ jobId, detail }: Props) {
  const updatedAt = detail?.job.updatedAt ? formatJobTimestamp(detail.job.updatedAt) : '—';
  const uploadVideoId = detail?.job.uploadVideoId?.trim();
  const sceneCount = detail?.sceneJson?.scenes.length ?? detail?.assets.length ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>최근 결과</CardTitle>
        <CardDescription>마지막 상태 변화와 바로 이어서 볼 화면만 남깁니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3 text-sm">
            <p className="text-xs text-muted-foreground">최근 상태</p>
            <p className="mt-1 font-medium">{detail?.job.status ?? '—'}</p>
          </div>
          <div className="rounded-lg border p-3 text-sm">
            <p className="text-xs text-muted-foreground">최근 갱신</p>
            <p className="mt-1 font-medium tabular-nums">{updatedAt}</p>
          </div>
          <div className="rounded-lg border p-3 text-sm">
            <p className="text-xs text-muted-foreground">씬 수</p>
            <p className="mt-1 font-medium">{sceneCount || '—'}</p>
          </div>
        </div>
        {uploadVideoId ? (
          <p className="text-sm text-muted-foreground">
            최근 업로드 결과 <span className="font-medium text-foreground">{uploadVideoId}</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            아직 외부 업로드 결과는 없습니다. 실행 이력에서 최근 작업을 확인하세요.
          </p>
        )}
        <div className="flex flex-wrap gap-2 border-t pt-4">
          <Link
            href={`/jobs/${jobId}/timeline`}
            className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent"
          >
            실행 이력 보기
          </Link>
          <Link
            href="/reviews"
            className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent"
          >
            검수함 보기
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
