'use client';

import { Clock3, Rocket, Sparkles } from 'lucide-react';

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
  const workflowRows = [
    {
      index: '01',
      title: '채널 인사이트 수집',
      hint: channelId
        ? `선택 라인 ${channelId} 기준으로 탐색합니다.`
        : '라인을 고르지 않으면 전역 스코프로 탐색합니다.',
      metric: channelId ? 'Scoped' : 'Global',
    },
    {
      index: '02',
      title: '트렌드 스카우트 실행',
      hint: enqueueTrendScout.isPending
        ? '큐에 작업을 넣는 중입니다.'
        : '버튼으로 스카우트 작업을 큐에 한 건씩 넣습니다.',
      metric: enqueueTrendScout.isPending ? 'Queueing' : 'Ready',
    },
    {
      index: '03',
      title: '후보 검토 및 저장',
      hint: trendDryRun
        ? '드라이런 모드에서는 스토어에 기록하지 않습니다.'
        : '결과를 후보/저장 단계로 이어갈 수 있습니다.',
      metric: trendDryRun ? 'Dry Run' : 'Store',
    },
  ] as const;
  const scopePercent = channelId ? 78 : 42;
  const activityRows = [
    {
      label: channelId ? '라인 선택 완료' : '전역 탐색 준비',
      detail: channelId ? `${channelId} scope` : 'No scoped line',
    },
    {
      label: channelId ? 'YouTube Search' : 'Channel selection',
      detail: trendDryRun ? 'Dry run mode' : 'Store mode',
    },
    {
      label: enqueueTrendScout.isSuccess ? 'Scout job queued' : '다음 액션 대기',
      detail: enqueueTrendScout.isSuccess ? 'Queue accepted' : 'Run scout when ready',
    },
  ] as const;

  return (
    <div className="grid grid-cols-12 gap-6">
      <section className="col-span-12 overflow-hidden rounded-xl border border-admin-outline-ghost/15 bg-white shadow-sm lg:col-span-8">
        <div className="flex items-center justify-between border-b border-admin-outline-ghost/10 bg-admin-surface-base/60 px-8 py-5">
          <h2 className="font-admin-display text-xl font-bold text-admin-primary">
            실시간 추천 흐름
          </h2>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-admin-primary">
            Refresh list
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
                  Stage
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="col-span-12 space-y-6 lg:col-span-4">
        <section className="relative overflow-hidden rounded-3xl bg-admin-primary p-6 text-white shadow-2xl shadow-slate-900/15">
          <div className="absolute -right-6 -top-6 size-24 rounded-full bg-white/5 blur-2xl" />
          <h2 className="font-admin-display text-xl font-extrabold">트렌드 스카우트</h2>
          <p className="mt-2 text-sm leading-6 text-indigo-100/90">
            외부 API 쿼터를 사용해 스카우트 작업을 큐에 넣습니다. 후보 탭에서 라인을 고르면 해당
            스코프로 실행됩니다.
          </p>

          <div className="mt-6 rounded-2xl bg-white/10 p-4">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.18em] text-indigo-100">
              <span>탐색 범위</span>
              <span>{scopePercent}%</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-white/80"
                style={{ width: `${scopePercent}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-sm text-indigo-100">
              <span>{channelId ? '선택 라인 기준' : '전역 스코프'}</span>
              <span>{trendDryRun ? 'Dry run' : 'Store mode'}</span>
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
            {enqueueTrendScout.isPending ? '큐에 넣는 중…' : '스카우트 실행하기'}
          </button>

          <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs text-indigo-100">
            <input
              type="checkbox"
              className="rounded border-white/30 bg-transparent"
              checked={trendDryRun}
              onChange={(e) => onTrendDryRunChange(e.target.checked)}
            />
            드라이런으로 실행하고 스토어에는 기록하지 않기
          </label>

          {enqueueTrendScout.isError ? (
            <p className="mt-3 text-xs text-rose-100">
              요청에 실패했습니다. 네트워크·권한·큐 설정을 확인하세요.
            </p>
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
              최근 탐색 활동
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
