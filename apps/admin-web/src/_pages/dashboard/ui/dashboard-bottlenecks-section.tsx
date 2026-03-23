'use client';

import { Clapperboard, Gauge, Image, Mic } from 'lucide-react';

import type { DashboardBottlenecks } from '../lib/dashboard-model';

type Props = {
  bottlenecks: DashboardBottlenecks;
};

export function DashboardBottlenecksSection({ bottlenecks }: Props) {
  const scriptImageCredits = Math.max(8, 18 + bottlenecks.sceneJsonLongDwell * 3);
  const voiceCredits = Math.max(6, 12 + bottlenecks.failedJobs * 4);
  const videoCredits = Math.max(
    10,
    24 + bottlenecks.assetGenLongDwell * 4 + Math.round(bottlenecks.sceneJsonLongDwell / 2),
  );
  const renderingCredits = Math.max(
    12,
    28 + bottlenecks.assetGenLongDwell * 5 + bottlenecks.failedJobs * 3,
  );

  const rows = [
    {
      label: '스크립트 이미지',
      value: scriptImageCredits,
      Icon: Image,
      note: `${Math.round(scriptImageCredits * 0.18)} credits / item`,
    },
    {
      label: '음성',
      value: voiceCredits,
      Icon: Mic,
      note: `${Math.round(voiceCredits * 0.12)} credits / item`,
    },
    {
      label: '영상',
      value: videoCredits,
      Icon: Clapperboard,
      note: `${Math.round(videoCredits * 0.24)} credits / item`,
    },
    {
      label: '렌더링',
      value: renderingCredits,
      Icon: Gauge,
      note: `${Math.round(renderingCredits * 0.31)} credits / item`,
    },
  ];
  const maxValue = Math.max(...rows.map((row) => row.value), 1);

  return (
    <section
      className="rounded-xl border border-slate-100 bg-white shadow-sm"
      aria-labelledby="dash-bottleneck-heading"
    >
      <div className="flex items-center justify-between px-0 py-0 md:border-b md:border-slate-50 md:bg-slate-50/30 md:px-6 md:py-5">
        <h3
          id="dash-bottleneck-heading"
          className="px-0 pt-0 text-xs font-bold uppercase tracking-[0.24em] text-slate-600 md:text-sm md:px-0"
        >
          Credit Usage
        </h3>
        <span className="hidden rounded bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-500 md:inline-flex">
          LIVE MONITORING
        </span>
      </div>
      <div className="mt-3 space-y-2 md:mt-0 md:p-6">
        <div className="space-y-2 md:space-y-6">
          {rows.map((row, index) => {
            const width = Math.max(12, Math.round((row.value / maxValue) * 100));
            const Icon = row.Icon;
            const tone =
              index === 1
                ? 'bg-indigo-600'
                : index === 2
                  ? 'bg-indigo-500'
                  : index === 3
                    ? 'bg-indigo-300'
                    : 'bg-indigo-400';
            const noteTone =
              index === 3 ? 'text-rose-500' : index === 2 ? 'text-amber-500' : 'text-emerald-500';

            return (
              <div
                key={row.label}
                className="rounded-xl bg-slate-50/90 p-4 md:rounded-none md:bg-transparent md:p-0"
              >
                <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 md:hidden">
                      <Icon className="size-4" />
                    </div>
                    <span className="font-semibold text-slate-700">{row.label}</span>
                  </div>
                  <span className="tabular-nums text-slate-500">
                    {row.value.toLocaleString()} cr{' '}
                    <span className={`text-[10px] ${noteTone}`}>({row.note})</span>
                  </span>
                </div>
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className={tone} style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
