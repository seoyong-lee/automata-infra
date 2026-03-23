'use client';

import Link from 'next/link';

export type DashboardChannelRow = {
  contentId: string;
  contentHref: string;
  totalJobs: number;
  uploadedCount: number;
  blockedCount: number;
  contentLabel: string;
};

type Props = {
  channelRows: DashboardChannelRow[];
  overallLoadPercent: number;
};

export function DashboardChannelSummarySection({ channelRows, overallLoadPercent }: Props) {
  const visibleRows = channelRows.slice(0, 5);

  return (
    <section className="rounded-xl border border-slate-100 bg-white shadow-sm" aria-labelledby="dash-channel-heading">
      <div className="flex items-center justify-between border-b border-slate-50 bg-slate-50/30 px-6 py-5">
        <h3
          id="dash-channel-heading"
          className="text-sm font-bold uppercase tracking-[0.24em] text-slate-600"
        >
          Channel Summary
        </h3>
        <span className="text-lg text-slate-400">⋮</span>
      </div>
      <div className="overflow-x-auto">
        {visibleRows.length === 0 ? (
          <div className="px-6 py-8 text-sm text-slate-500">
            아직 집계할 채널이 없습니다. 먼저 채널을 추가하거나 제작 아이템을 생성하세요.
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                  Channel Name
                </th>
                <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                  Jobs
                </th>
                <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visibleRows.map((row) => {
                const status =
                  row.totalJobs === 0 ? 'Idle' : row.blockedCount > 0 ? 'Congested' : 'Active';
                const dotClassName =
                  status === 'Active'
                    ? 'bg-emerald-500'
                    : status === 'Congested'
                      ? 'bg-amber-500'
                      : 'bg-slate-300';
                const badgeClassName =
                  status === 'Active'
                    ? 'bg-emerald-50 text-emerald-700'
                    : status === 'Congested'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-slate-100 text-slate-500';

                return (
                  <tr key={row.contentId}>
                    <td className="px-6 py-4">
                      <Link href={row.contentHref} className="flex items-center gap-3">
                        <div className={`size-2 rounded-full ${dotClassName}`} />
                        <span className="text-xs font-bold text-slate-700">{row.contentLabel}</span>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-medium tabular-nums text-slate-600">
                        {String(row.totalJobs).padStart(2, '0')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${badgeClassName}`}>
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <div className="border-t border-slate-50 bg-slate-50/20 p-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">Overall System Load</span>
          <span className="text-xs font-bold text-indigo-600">{overallLoadPercent}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-700"
            style={{ width: `${overallLoadPercent}%` }}
          />
        </div>
      </div>
    </section>
  );
}
