'use client';

import { BarChart3, MessageCircle, SearchCheck, TrendingUp } from 'lucide-react';

type Props = {
  channelProbe: string;
  onChannelProbeChange: (v: string) => void;
  onGoShortlist: () => void;
};

export function DiscoveryChannelFindSection({
  channelProbe,
  onChannelProbeChange,
  onGoShortlist,
}: Props) {
  const previewCards = [
    { label: 'Engagement', Icon: BarChart3 },
    { label: 'Growth Rate', Icon: TrendingUp },
    { label: 'Sentiment', Icon: MessageCircle },
  ] as const;

  return (
    <section className="rounded-xl border border-admin-outline-ghost/15 bg-white p-8 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-admin-display text-2xl font-extrabold tracking-tight text-admin-primary">
            채널 찾기
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-admin-text-muted">
            YouTube 채널 ID를 직접 적어 두고 후보 탭으로 넘겨 관심 채널에 추가하세요. 현재 구조는
            유지하되, 탐색 시작점을 한 눈에 보이게 정리했습니다.
          </p>
        </div>
        <div className="flex size-11 items-center justify-center rounded-xl bg-admin-primary-container/20 text-admin-primary">
          <SearchCheck className="size-5" />
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-end">
        <div className="min-w-0 flex-1">
          <label
            className="mb-2 block text-[10px] font-bold uppercase tracking-[0.22em] text-admin-text-muted"
            htmlFor="probe-ch"
          >
            YouTube Channel ID
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-admin-text-muted">
              @
            </span>
            <input
              id="probe-ch"
              type="text"
              value={channelProbe}
              onChange={(e) => onChannelProbeChange(e.target.value)}
              placeholder="예: UCxxxxxxxx"
              className="h-14 w-full rounded-lg border-none bg-admin-surface-section px-8 pr-4 text-sm text-admin-text-strong outline-none ring-0 placeholder:text-admin-text-muted focus:ring-2 focus:ring-admin-primary/20"
            />
          </div>
        </div>
        <button
          type="button"
          className="inline-flex h-14 shrink-0 items-center justify-center rounded-md bg-linear-to-br from-admin-primary to-admin-primary-container px-8 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition-transform hover:scale-[1.01] active:scale-[0.99]"
          onClick={onGoShortlist}
        >
          후보에 추가
        </button>
      </div>

      <div className="mt-8 grid gap-6 border-t border-admin-outline-ghost/10 pt-8 md:grid-cols-3">
        {previewCards.map(({ label, Icon }) => (
          <div
            key={label}
            className="flex min-h-[120px] flex-col items-center justify-center rounded-xl border border-dashed border-admin-outline-ghost/30 bg-admin-surface-base p-4"
          >
            <Icon className="mb-3 size-7 text-admin-outline-ghost" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-admin-text-muted">
              {label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
