'use client';

import { getErrorMessage } from '@packages/utils';
import Link from 'next/link';
import { useMemo } from 'react';

import { useAdminContents } from '@/entities/admin-content';
import { useAdminJobs, usePendingReviews } from '@/entities/admin-job';

import { buildDashboardSnapshot, DASHBOARD_JOBS_QUERY_LIMIT } from '../lib/dashboard-model';
import { DashboardActionQueueSection } from './dashboard-action-queue-section';
import { DashboardBottlenecksSection } from './dashboard-bottlenecks-section';
import { DashboardChannelSummarySection } from './dashboard-channel-summary-section';
import type { DashboardChannelRow } from './dashboard-channel-summary-section';
import { DashboardOptimizationCard } from './dashboard-optimization-card';
import { DashboardResumeSection } from './dashboard-resume-section';

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

  const { actionQueue, bottlenecks, resume } = snapshot;
  const activeChannels = channelRows.filter((row) => row.totalJobs > 0).length;
  const activeJobs = jobs.filter(
    (job) =>
      !['UPLOADED', 'METRICS_COLLECTED', 'APPROVED', 'FAILED', 'REJECTED'].includes(job.status),
  ).length;
  const overallLoadPercent = Math.max(
    8,
    Math.min(
      100,
      Math.round(
        ((activeJobs + actionQueue.reviewNeeded + actionQueue.uploadPending) /
          Math.max(jobs.length || 1, 1)) *
          40 +
          (activeChannels / Math.max(channelRows.length || 1, 1)) * 35,
      ),
    ),
  );
  const optimizationCount =
    Number(bottlenecks.sceneJsonLongDwell > 0) +
    Number(bottlenecks.assetGenLongDwell > 0) +
    Number(bottlenecks.failedJobs > 0);
  const savingsPercent = Math.max(
    8,
    Math.min(24, 8 + bottlenecks.assetGenLongDwell * 2 + bottlenecks.sceneJsonLongDwell),
  );

  return (
    <div className="space-y-6 pb-4 md:space-y-8 md:pb-8">
      <div className="space-y-6 md:space-y-10">
        <div>
          <h2 className="font-admin-display text-[2rem] font-extrabold tracking-tight text-slate-900 md:text-3xl">
            System Snapshot
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Real-time production health monitoring
          </p>
        </div>

        <DashboardActionQueueSection
          reviewNeeded={actionQueue.reviewNeeded}
          activeJobs={activeJobs}
          uploadPending={actionQueue.uploadPending}
          failedExecutions={bottlenecks.failedJobs}
        />
      </div>

      {jobsQuery.error ? (
        <p className="text-sm text-destructive">{getErrorMessage(jobsQuery.error)}</p>
      ) : null}
      {pendingReviewsQuery.error ? (
        <p className="text-sm text-destructive">{getErrorMessage(pendingReviewsQuery.error)}</p>
      ) : null}
      {contentsQuery.error ? (
        <p className="text-sm text-destructive">{getErrorMessage(contentsQuery.error)}</p>
      ) : null}

      <div className="grid grid-cols-12 gap-4 md:gap-6 items-start">
        <div className="col-span-12 space-y-6 lg:col-span-7">
          <DashboardBottlenecksSection bottlenecks={bottlenecks} />
          <DashboardResumeSection jobs={resume.recentUpdatedJobs} />
        </div>
        <div className="col-span-12 lg:col-span-5">
          <DashboardChannelSummarySection
            channelRows={channelRows}
            overallLoadPercent={overallLoadPercent}
          />
          <div className="mt-6">
            <DashboardOptimizationCard
              suggestionCount={Math.max(1, optimizationCount)}
              savingsPercent={savingsPercent}
            />
          </div>
        </div>
      </div>

      <Link
        href="/jobs/new"
        className="fixed bottom-8 right-8 z-30 hidden size-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-2xl transition-transform hover:scale-105 active:scale-95 md:flex"
      >
        <span className="text-2xl leading-none">+</span>
      </Link>
    </div>
  );
}
