'use client';

import { Badge } from '@packages/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import Link from 'next/link';

import { getJobPhaseLabelKo, getJobStatusLabelKo } from '@/widgets/content-operations';
import type { AdminJob } from '@/entities/admin-job';

import type { ResumeReviewRow } from '../lib/dashboard-model';
import { formatRelativeKo } from '../lib/format-relative-ko';

export function DashboardResumeRecentJobsCard({
  jobs,
  loading,
}: {
  jobs: AdminJob[];
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">최근 갱신 제작 아이템</CardTitle>
        <CardDescription>갱신 순·상위 {jobs.length}건</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? <p className="text-sm text-muted-foreground">불러오는 중…</p> : null}
        {!loading && jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">항목이 없습니다.</p>
        ) : null}
        {jobs.map((job) => (
          <div
            key={job.jobId}
            className="flex flex-col gap-1 rounded-md border border-border/80 px-3 py-2"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-normal">
                {getJobPhaseLabelKo(job.status)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatRelativeKo(job.updatedAt)}
              </span>
            </div>
            <p className="line-clamp-2 text-sm font-medium leading-snug">{job.videoTitle}</p>
            <Link
              href={`/jobs/${job.jobId}/overview`}
              className="text-xs font-medium text-primary hover:underline"
            >
              이어하기 →
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function DashboardResumeRecentReviewsCard({
  rows,
  loading,
}: {
  rows: ResumeReviewRow[];
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">최근 검수 요청</CardTitle>
        <CardDescription>요청 시각 순</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? <p className="text-sm text-muted-foreground">불러오는 중…</p> : null}
        {!loading && rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">검수 대기가 없습니다.</p>
        ) : null}
        {rows.map((row) => (
          <div
            key={row.jobId}
            className="flex flex-col gap-1 rounded-md border border-border/80 px-3 py-2"
          >
            <p className="line-clamp-2 text-sm font-medium leading-snug">{row.title}</p>
            <p className="text-xs text-muted-foreground">
              {row.reviewRequestedAt ? formatRelativeKo(row.reviewRequestedAt) : '요청 시각 없음'}
            </p>
            <Link
              href={`/jobs/${row.jobId}/overview`}
              className="text-xs font-medium text-primary hover:underline"
            >
              검수 화면으로 →
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function DashboardResumeRecentFailuresCard({
  jobs,
  loading,
}: {
  jobs: AdminJob[];
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">최근 실패</CardTitle>
        <CardDescription>갱신 순·상위 {jobs.length}건</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? <p className="text-sm text-muted-foreground">불러오는 중…</p> : null}
        {!loading && jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">실패 항목이 없습니다.</p>
        ) : null}
        {jobs.map((job) => (
          <div
            key={job.jobId}
            className="flex flex-col gap-1 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2"
          >
            <Badge variant="outline" className="w-fit border-destructive/40 font-normal">
              {getJobStatusLabelKo(job.status)}
            </Badge>
            <p className="line-clamp-2 text-sm font-medium leading-snug">{job.videoTitle}</p>
            <p className="text-xs text-muted-foreground">{formatRelativeKo(job.updatedAt)}</p>
            <Link
              href={`/jobs/${job.jobId}/overview`}
              className="text-xs font-medium text-primary hover:underline"
            >
              원인 확인 →
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
