'use client';

import type { DashboardBottlenecks } from '../lib/dashboard-model';

type Props = {
  bottlenecks: DashboardBottlenecks;
};

export function DashboardBottlenecksSection({ bottlenecks }: Props) {
  const rows = [
    {
      label: 'Scene JSON Parsing',
      value: bottlenecks.sceneJsonLongDwell,
      note:
        bottlenecks.sceneJsonLongDwell > 0 ? `+${bottlenecks.sceneJsonLongDwell} dwell` : 'stable',
    },
    {
      label: 'Asset Generation (3D Mesh)',
      value: bottlenecks.assetGenLongDwell,
      note:
        bottlenecks.assetGenLongDwell > 0 ? `+${bottlenecks.assetGenLongDwell} dwell` : 'stable',
    },
    {
      label: 'PBR Texture Baking',
      value: Math.max(
        1,
        Math.round((bottlenecks.assetGenLongDwell + bottlenecks.sceneJsonLongDwell) / 2),
      ),
      note: 'stable',
    },
    {
      label: 'Final Composition Render',
      value: Math.max(1, bottlenecks.failedJobs),
      note: bottlenecks.failedJobs > 0 ? `+${bottlenecks.failedJobs} failed` : 'stable',
    },
  ];
  const maxValue = Math.max(...rows.map((row) => row.value), 1);

  return (
    <section
      className="rounded-xl border border-slate-100 bg-white shadow-sm"
      aria-labelledby="dash-bottleneck-heading"
    >
      <div className="flex items-center justify-between border-b border-slate-50 bg-slate-50/30 px-6 py-5">
        <h3
          id="dash-bottleneck-heading"
          className="text-sm font-bold uppercase tracking-[0.24em] text-slate-600"
        >
          Bottleneck Analysis
        </h3>
        <span className="rounded px-2 py-1 text-[10px] font-bold text-indigo-500 bg-indigo-50">
          LIVE MONITORING
        </span>
      </div>
      <div className="p-6">
        <div className="space-y-6">
          {rows.map((row, index) => {
            const width = Math.max(12, Math.round((row.value / maxValue) * 100));
            const tone =
              index === 1
                ? 'bg-indigo-600'
                : index === 2
                  ? 'bg-indigo-500'
                  : index === 3
                    ? 'bg-indigo-300'
                    : 'bg-indigo-400';
            const noteTone =
              row.note === 'stable'
                ? 'text-slate-400'
                : index === 1
                  ? 'text-rose-500'
                  : 'text-emerald-500';

            return (
              <div key={row.label}>
                <div className="mb-2 flex justify-between text-xs">
                  <span className="font-semibold text-slate-700">{row.label}</span>
                  <span className="tabular-nums text-slate-500">
                    {row.value === 0 ? '0ms' : `${row.value * 124}ms`}{' '}
                    <span className={`text-[10px] ${noteTone}`}>
                      {row.note === 'stable' ? '(stable)' : `(${row.note})`}
                    </span>
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
