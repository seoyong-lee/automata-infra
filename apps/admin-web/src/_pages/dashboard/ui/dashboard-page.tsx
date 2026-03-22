'use client';

import { getErrorMessage } from '@packages/utils';
import { useMemo } from 'react';

import { useAdminContents } from '@/entities/admin-content';
import { useAdminJobs, usePendingReviews } from '@/entities/admin-job';
import { AdminPageHeader } from '@/shared/ui/admin-page-header';

import { buildDashboardSnapshot, DASHBOARD_JOBS_QUERY_LIMIT } from '../lib/dashboard-model';
import { DashboardActionQueueSection } from './dashboard-action-queue-section';
import { DashboardBottlenecksSection } from './dashboard-bottlenecks-section';
import { DashboardChannelSummarySection } from './dashboard-channel-summary-section';
import type { DashboardChannelRow } from './dashboard-channel-summary-section';

export function DashboardPage() {
  const jobsQuery = useAdminJobs({ limit: DASHBOARD_JOBS_QUERY_LIMIT });
  const contentsQuery = useAdminContents({ limit: 100 });
  const pendingReviewsQuery = usePendingReviews({ limit: 100 });

  const jobs = useMemo(() => jobsQuery.data?.items ?? [], [jobsQuery.data?.items]);
  const pendingReviews = useMemo(
    () => pendingReviewsQuery.data?.items ?? [],
    [pendingReviewsQuery.data?.items],
  );
  const catalog = useMemo(() => contentsQuery.data?.items ?? [], [contentsQuery.data?.items]);

  const snapshot = useMemo(
    () => buildDashboardSnapshot(jobs, pendingReviews),
    [jobs, pendingReviews],
  );

  const channelRows = useMemo((): DashboardChannelRow[] => {
    const contentIds = Array.from(
      new Set(
        [...catalog.map((c) => c.contentId), ...jobs.map((item) => item.contentId)].filter(
          (id): id is string => Boolean(id),
        ),
      ),
    ).sort();

    return contentIds.map((contentId) => {
      const channelJobs = jobs.filter((job) => job.contentId === contentId);
      const uploadedCount = channelJobs.filter((job) => job.status === 'UPLOADED').length;
      const blockedCount = channelJobs.filter(
        (job) => job.status === 'FAILED' || job.status === 'REVIEW_PENDING',
      ).length;
      return {
        contentId,
        contentHref: `/content/${encodeURIComponent(contentId)}/jobs`,
        totalJobs: channelJobs.length,
        uploadedCount,
        blockedCount,
        contentLabel: catalog.find((c) => c.contentId === contentId)?.label ?? '—',
      };
    });
  }, [jobs, catalog]);

  const loading = jobsQuery.isLoading;
  const { actionQueue, bottlenecks, resume } = snapshot;

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="대시보드"
        subtitle="오늘 처리할 일·병목·이어서 작업 순으로 우선순위를 보여 줍니다. 숫자는 최근 표본(제작 아이템 목록 한도) 기준입니다."
      />

      {jobsQuery.error ? (
        <p className="text-sm text-destructive">{getErrorMessage(jobsQuery.error)}</p>
      ) : null}
      {pendingReviewsQuery.error ? (
        <p className="text-sm text-destructive">{getErrorMessage(pendingReviewsQuery.error)}</p>
      ) : null}
      {contentsQuery.error ? (
        <p className="text-sm text-destructive">{getErrorMessage(contentsQuery.error)}</p>
      ) : null}

      <DashboardActionQueueSection actionQueue={actionQueue} />
      <DashboardBottlenecksSection bottlenecks={bottlenecks} />
      <DashboardChannelSummarySection channelRows={channelRows} />
    </div>
  );
}
