'use client';

import { CheckCircle2, RotateCw, TriangleAlert } from 'lucide-react';
import Link from 'next/link';

import { getJobStatusLabelKo, type AdminJob } from '@/entities/admin-job';

import { formatRelativeKo } from '../lib/format-relative-ko';

type Props = {
  jobs: AdminJob[];
};

export function DashboardResumeSection({ jobs }: Props) {
  return (
    <section
      className="rounded-xl border border-slate-100 bg-white shadow-sm"
      aria-labelledby="dash-resume-heading"
    >
      <div className="flex items-center justify-between border-b border-slate-50 bg-slate-50/30 px-4 py-4 md:px-6 md:py-5">
        <h3
          id="dash-resume-heading"
          className="text-xs font-bold uppercase tracking-[0.24em] text-slate-600 md:text-sm"
        >
          Recent Pipeline Executions
        </h3>
        <Link href="/jobs" className="text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-600 hover:underline md:text-xs md:normal-case md:tracking-normal">
          View All
        </Link>
      </div>
      <div className="space-y-3 p-4 md:hidden">
        {jobs.length === 0 ? (
          <div className="text-sm text-slate-500">표시할 실행 이력이 없습니다.</div>
        ) : null}
        {jobs.slice(0, 2).map((job) => {
          const isFailed = job.status === 'FAILED';
          const isSuccess =
            job.status === 'UPLOADED' ||
            job.status === 'METRICS_COLLECTED' ||
            job.status === 'APPROVED';
          const borderTone = isSuccess ? 'border-green-500' : isFailed ? 'border-amber-500' : 'border-indigo-500';
          const badgeTone = isSuccess
            ? 'bg-green-100 text-green-700'
            : isFailed
              ? 'bg-amber-100 text-amber-700'
              : 'bg-indigo-100 text-indigo-700';
          const badgeLabel = isSuccess ? 'Success' : isFailed ? 'Warning' : 'Running';
          const confidenceValue = isSuccess ? '98.4%' : isFailed ? '72.1%' : '84.0%';
          const confidenceTone = isSuccess ? 'text-indigo-700' : isFailed ? 'text-rose-600' : 'text-indigo-700';

          return (
            <Link
              key={job.jobId}
              href={`/jobs/${job.jobId}/overview`}
              className={`block rounded-xl border-l-4 ${borderTone} bg-white p-4 shadow-sm`}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="mb-0.5 text-xs font-bold text-admin-primary">#{job.jobId}</div>
                  <h4 className="font-admin-display text-sm font-bold text-slate-900">
                    {job.contentId || 'Neural Synthesis'}
                  </h4>
                </div>
                <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${badgeTone}`}>
                  {badgeLabel}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.16em] text-slate-400">Runtime</div>
                  <div className="text-xs font-bold text-slate-900">{formatRelativeKo(job.updatedAt)}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-[0.16em] text-slate-400">Confidence</div>
                  <div className={`text-xs font-bold ${confidenceTone}`}>{confidenceValue}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="hidden divide-y divide-slate-50 md:block">
        {jobs.length === 0 ? (
          <div className="px-6 py-6 text-sm text-slate-500">표시할 실행 이력이 없습니다.</div>
        ) : null}
        {jobs.map((job) => {
          const isFailed = job.status === 'FAILED';
          const isSuccess =
            job.status === 'UPLOADED' ||
            job.status === 'METRICS_COLLECTED' ||
            job.status === 'APPROVED';
          const Icon = isFailed ? TriangleAlert : isSuccess ? CheckCircle2 : RotateCw;
          const iconTone = isFailed
            ? 'bg-rose-50 text-rose-600'
            : isSuccess
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-indigo-50 text-indigo-600';
          const detailTone = isFailed ? 'text-rose-500' : 'text-indigo-500';
          const detailLabel = isFailed ? 'Err: Timeout' : isSuccess ? 'Log: 4KB' : 'Log: Streaming';

          return (
            <Link
              key={job.jobId}
              href={`/jobs/${job.jobId}/overview`}
              className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-slate-50/50"
            >
              <div className={`flex size-10 items-center justify-center rounded-lg ${iconTone}`}>
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-900">Execution #{job.jobId}</p>
                <p className="truncate text-[11px] text-slate-500">
                  Channel:{' '}
                  <span className="font-medium text-slate-700">
                    {job.contentId || 'Unassigned'}
                  </span>{' '}
                  • {getJobStatusLabelKo(job.status)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold tabular-nums text-slate-400">
                  {formatRelativeKo(job.updatedAt)}
                </p>
                <p className={`text-[10px] font-semibold ${detailTone}`}>{detailLabel}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
