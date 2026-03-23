'use client';

import { Clock3, Rocket, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

type TrendEnqueue = {
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  data?: { enqueueTrendScoutJob: { message: string } } | null;
  mutate: (vars: { channelId?: string; dryRun?: boolean }) => void;
};

type Props = {
  channelId: string;
  trendDryRun: boolean;
  onTrendDryRunChange: (v: boolean) => void;
  enqueueTrendScout: TrendEnqueue;
};

export function DiscoveryTrendSection({
  channelId,
  trendDryRun,
  onTrendDryRunChange,
  enqueueTrendScout,
}: Props) {
  const t = useTranslations('discovery.trend');
  const workflowRows = [
    {
      index: '01',
      title: t('insightCollection'),
      hint: channelId
        ? t('insightCollectionScoped', { channelId })
        : t('insightCollectionGlobal'),
      metric: channelId ? t('scopedScope') : t('globalScope'),
    },
    {
      index: '02',
      title: t('scoutRun'),
      hint: enqueueTrendScout.isPending
        ? t('scoutQueueing')
        : t('scoutReady'),
      metric: enqueueTrendScout.isPending ? t('queueing') : t('ready'),
    },
    {
      index: '03',
      title: t('reviewAndSave'),
      hint: trendDryRun
        ? t('reviewDryRun')
        : t('reviewStore'),
      metric: trendDryRun ? t('dryRun') : t('store'),
    },
  ] as const;
  const scopePercent = channelId ? 78 : 42;
  const activityRows = [
    {
      label: channelId ? t('lineSelected') : t('globalReady'),
      detail: channelId ? `${channelId} scope` : t('noScopedLine'),
    },
    {
      label: channelId ? 'YouTube Search' : t('channelSelection'),
      detail: trendDryRun ? t('dryRun') : t('storeMode'),
    },
    {
      label: enqueueTrendScout.isSuccess ? t('scoutJobQueued') : t('waitingNextAction'),
      detail: enqueueTrendScout.isSuccess ? t('queueAccepted') : t('runScoutWhenReady'),
    },
  ] as const;

  return (
    <div className="grid grid-cols-12 gap-6">
      <section className="col-span-12 overflow-hidden rounded-xl border border-admin-outline-ghost/15 bg-white shadow-sm lg:col-span-8">
        <div className="flex items-center justify-between border-b border-admin-outline-ghost/10 bg-admin-surface-base/60 px-8 py-5">
          <h2 className="font-admin-display text-xl font-bold text-admin-primary">
            {t('title')}
          </h2>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-admin-primary">
            {t('refreshList')}
          </span>
        </div>
        <div className="divide-y divide-admin-outline-ghost/10">
          {workflowRows.map((row) => (
            <div
              key={row.index}
              className="flex flex-col gap-4 px-8 py-5 transition-colors hover:bg-admin-surface-base/60 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-xl bg-admin-primary-container/20 text-sm font-bold text-admin-primary">
                  {row.index}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-admin-text-strong">{row.title}</h3>
                  <p className="mt-1 text-xs text-admin-text-muted">{row.hint}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-admin-text-strong">{row.metric}</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-admin-text-muted">
                  {t('stage')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="col-span-12 space-y-6 lg:col-span-4">
        <section className="relative overflow-hidden rounded-3xl bg-admin-primary p-6 text-white shadow-2xl shadow-slate-900/15">
          <div className="absolute -right-6 -top-6 size-24 rounded-full bg-white/5 blur-2xl" />
          <h2 className="font-admin-display text-xl font-extrabold">{t('scoutTitle')}</h2>
          <p className="mt-2 text-sm leading-6 text-indigo-100/90">
            {t('scoutDescription')}
          </p>

          <div className="mt-6 rounded-2xl bg-white/10 p-4">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.18em] text-indigo-100">
              <span>{t('scope')}</span>
              <span>{scopePercent}%</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-white/80"
                style={{ width: `${scopePercent}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-sm text-indigo-100">
              <span>{channelId ? t('scoped') : t('global')}</span>
              <span>{trendDryRun ? t('dryRun') : t('storeMode')}</span>
            </div>
          </div>

          <button
            type="button"
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-white px-4 text-sm font-bold text-admin-primary transition-colors hover:bg-indigo-50 disabled:opacity-60"
            disabled={enqueueTrendScout.isPending}
            onClick={() =>
              enqueueTrendScout.mutate({
                channelId: channelId || undefined,
                dryRun: trendDryRun || undefined,
              })
            }
          >
            <Rocket className="mr-2 size-4" />
            {enqueueTrendScout.isPending ? t('executePending') : t('execute')}
          </button>

          <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs text-indigo-100">
            <input
              type="checkbox"
              className="rounded border-white/30 bg-transparent"
              checked={trendDryRun}
              onChange={(e) => onTrendDryRunChange(e.target.checked)}
            />
            {t('dryRunToggle')}
          </label>

          {enqueueTrendScout.isError ? (
            <p className="mt-3 text-xs text-rose-100">{t('requestFailed')}</p>
          ) : null}
          {enqueueTrendScout.isSuccess && enqueueTrendScout.data ? (
            <p className="mt-3 text-xs text-emerald-100">
              {enqueueTrendScout.data.enqueueTrendScoutJob.message}
            </p>
          ) : null}
        </section>

        <section className="rounded-xl border border-admin-outline-ghost/15 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-admin-outline-ghost/10 px-6 py-5">
            <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-admin-text-muted">
              {t('recentActivity')}
            </h3>
            <Clock3 className="size-4 text-admin-text-muted" />
          </div>
          <div className="divide-y divide-admin-outline-ghost/10">
            {activityRows.map((row, index) => (
              <div key={`${row.label}-${index}`} className="flex items-start gap-3 px-6 py-4">
                <div className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-admin-surface-section text-admin-primary">
                  <Sparkles className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-admin-text-strong">{row.label}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-admin-text-muted">
                    {row.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
