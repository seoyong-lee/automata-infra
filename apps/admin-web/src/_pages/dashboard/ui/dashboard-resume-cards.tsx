'use client';

import { Badge } from '@packages/ui/badge';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { getJobPhaseLabelKo, getJobStatusLabelKo, type AdminJob } from '@/entities/admin-job';

import type { ResumeReviewRow } from '../lib/dashboard-model';
import { formatRelativeKo } from '../lib/format-relative-ko';
import { DashboardResumeCard } from './dashboard-resume-card';

function ResumeItem({ children, danger = false }: { children: ReactNode; danger?: boolean }) {
  return (
    <div
      className={
        danger
          ? 'flex flex-col gap-1 rounded-xl border border-admin-status-error/20 bg-admin-status-error-surface px-3 py-3'
          : 'flex flex-col gap-1 rounded-xl border border-admin-outline-ghost bg-admin-surface-section/70 px-3 py-3'
      }
    >
      {children}
    </div>
  );
}

export function DashboardResumeRecentJobsCard({
  jobs,
  loading,
}: {
  jobs: AdminJob[];
  loading: boolean;
}) {
  return (
    <DashboardResumeCard
      title="최근 갱신 제작 아이템"
      description={<>갱신 순·상위 {jobs.length}건</>}
      loading={loading}
      emptyMessage="항목이 없습니다."
      isEmpty={jobs.length === 0}
    >
      {jobs.map((job) => (
        <ResumeItem key={job.jobId}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-admin-outline-ghost bg-admin-surface-card font-normal"
            >
              {getJobPhaseLabelKo(job.status)}
            </Badge>
            <span className="text-xs text-admin-text-muted">{formatRelativeKo(job.updatedAt)}</span>
          </div>
          <p className="line-clamp-2 text-sm font-medium leading-snug text-admin-text-strong">
            {job.videoTitle}
          </p>
          <Link
            href={`/jobs/${job.jobId}/overview`}
            className="text-xs font-medium text-admin-primary hover:underline"
          >
            이어하기 →
          </Link>
        </ResumeItem>
      ))}
    </DashboardResumeCard>
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
    <DashboardResumeCard
      title="최근 검수 요청"
      description="요청 시각 순"
      loading={loading}
      emptyMessage="검수 대기가 없습니다."
      isEmpty={rows.length === 0}
    >
      {rows.map((row) => (
        <ResumeItem key={row.jobId}>
          <p className="line-clamp-2 text-sm font-medium leading-snug text-admin-text-strong">
            {row.title}
          </p>
          <p className="text-xs text-admin-text-muted">
            {row.reviewRequestedAt ? formatRelativeKo(row.reviewRequestedAt) : '요청 시각 없음'}
          </p>
          <Link
            href={`/jobs/${row.jobId}/overview`}
            className="text-xs font-medium text-admin-primary hover:underline"
          >
            검수 화면으로 →
          </Link>
        </ResumeItem>
      ))}
    </DashboardResumeCard>
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
    <DashboardResumeCard
      title="최근 실패"
      description={<>갱신 순·상위 {jobs.length}건</>}
      loading={loading}
      emptyMessage="실패 항목이 없습니다."
      isEmpty={jobs.length === 0}
    >
      {jobs.map((job) => (
        <ResumeItem key={job.jobId} danger>
          <Badge
            variant="outline"
            className="w-fit border-admin-status-error/35 bg-white/40 font-normal"
          >
            {getJobStatusLabelKo(job.status)}
          </Badge>
          <p className="line-clamp-2 text-sm font-medium leading-snug text-admin-text-strong">
            {job.videoTitle}
          </p>
          <p className="text-xs text-admin-text-muted">{formatRelativeKo(job.updatedAt)}</p>
          <Link
            href={`/jobs/${job.jobId}/overview`}
            className="text-xs font-medium text-admin-primary hover:underline"
          >
            원인 확인 →
          </Link>
        </ResumeItem>
      ))}
    </DashboardResumeCard>
  );
}
