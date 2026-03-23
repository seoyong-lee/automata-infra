'use client';

import { CloudUpload, Bolt, CircleAlert, MessageSquareMore } from 'lucide-react';
import { useTranslations } from 'next-intl';

type Props = {
  reviewNeeded: number;
  activeJobs: number;
  uploadPending: number;
  failedExecutions: number;
};

const metrics = [
  {
    key: 'review',
    label: 'Pending Reviews',
    badge: '+12.5%',
    badgeClassName: 'bg-emerald-50 text-emerald-600',
    barClassName: 'bg-indigo-500',
    iconClassName: 'bg-indigo-50 text-indigo-500',
    Icon: MessageSquareMore,
  },
  {
    key: 'active',
    label: 'Active Jobs',
    badge: 'Stable',
    badgeClassName: 'bg-slate-50 text-slate-400',
    barClassName: 'bg-blue-500',
    iconClassName: 'bg-blue-50 text-blue-500',
    Icon: Bolt,
  },
  {
    key: 'upload',
    label: 'Upload Queue',
    badge: '85% Cap',
    badgeClassName: 'bg-amber-50 text-amber-600',
    barClassName: 'bg-amber-500',
    iconClassName: 'bg-amber-50 text-amber-500',
    Icon: CloudUpload,
  },
  {
    key: 'failed',
    label: 'Failed Executions',
    badge: 'High Alert',
    badgeClassName: 'bg-rose-50 text-rose-600',
    barClassName: 'bg-rose-500',
    iconClassName: 'bg-rose-50 text-rose-500',
    Icon: CircleAlert,
  },
] as const;

export function DashboardActionQueueSection({
  reviewNeeded,
  activeJobs,
  uploadPending,
  failedExecutions,
}: Props) {
  const t = useTranslations('dashboard.metrics');
  const metricValues = {
    review: reviewNeeded,
    active: activeJobs,
    upload: uploadPending,
    failed: failedExecutions,
  } as const;

  const maxValue = Math.max(reviewNeeded, activeJobs, uploadPending, failedExecutions, 1);
  const localizedMetrics = [
    { ...metrics[0], label: t('pendingReviews'), badge: t('badgeLive') },
    { ...metrics[1], label: t('activeJobs'), badge: t('badgeStable') },
    { ...metrics[2], label: t('uploadQueue'), badge: t('badgeCap') },
    { ...metrics[3], label: t('failedExecutions'), badge: t('badgeHighAlert') },
  ] as const;

  return (
    <section className="grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-4" aria-label="System metrics">
      {localizedMetrics.map((metric) => {
        const value = metricValues[metric.key];
        const percent = Math.max(8, Math.round((value / maxValue) * 100));
        const Icon = metric.Icon;
        return (
          <article
            key={metric.key}
            className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md md:rounded-xl md:p-6"
          >
            <div className="mb-3 flex items-start justify-between md:mb-4">
              <div className={`rounded-lg p-2 ${metric.iconClassName}`}>
                <Icon className="size-4" />
              </div>
              <span
                className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] md:rounded-full md:px-2 md:text-[10px] ${metric.badgeClassName}`}
              >
                {metric.badge}
              </span>
            </div>
            <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400 md:text-[10px] md:tracking-[0.24em]">
              {metric.label}
            </p>
            <h3 className="font-admin-display text-3xl leading-none font-extrabold tabular-nums text-slate-900 md:text-4xl">
              {metric.key === 'failed' ? String(value).padStart(2, '0') : value.toLocaleString()}
            </h3>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-100 md:mt-4">
              <div className={`h-full ${metric.barClassName}`} style={{ width: `${percent}%` }} />
            </div>
          </article>
        );
      })}
    </section>
  );
}
