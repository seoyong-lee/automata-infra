'use client';

import type { DashboardResume } from '../lib/dashboard-model';
import {
  DashboardResumeRecentFailuresCard,
  DashboardResumeRecentJobsCard,
  DashboardResumeRecentReviewsCard,
} from './dashboard-resume-cards';

type Props = {
  resume: DashboardResume;
  loading: boolean;
};

export function DashboardResumeSection({ resume, loading }: Props) {
  return (
    <section className="space-y-3" aria-labelledby="dash-resume-heading">
      <h2 id="dash-resume-heading" className="text-lg font-semibold tracking-tight">
        이어서 작업
      </h2>
      <div className="grid gap-4 lg:grid-cols-3">
        <DashboardResumeRecentJobsCard jobs={resume.recentUpdatedJobs} loading={loading} />
        <DashboardResumeRecentReviewsCard rows={resume.recentReviewRequests} loading={loading} />
        <DashboardResumeRecentFailuresCard jobs={resume.recentFailedJobs} loading={loading} />
      </div>
    </section>
  );
}
