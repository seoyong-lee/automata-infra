'use client';

import Link from 'next/link';
import { Podcast, Tv2 } from 'lucide-react';

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
      <div className="flex items-center justify-between border-b border-slate-50 bg-slate-50/30 px-4 py-4 md:px-6 md:py-5">
        <h3
          id="dash-channel-heading"
          className="text-xs font-bold uppercase tracking-[0.24em] text-slate-600 md:text-sm"
        >
          Channel Summary
        </h3>
        <span className="hidden text-lg text-slate-400 md:inline">⋮</span>
      </div>
      <div className="md:hidden">
        {visibleRows.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-500">
            아직 집계할 채널이 없습니다. 먼저 채널을 추가하거나 제작 아이템을 생성하세요.
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {visibleRows.slice(0, 2).map((row, index) => {
              const Icon = index % 2 === 0 ? Tv2 : Podcast;
              const deltaLabel = row.blockedCount > 0 ? '--' : `+${Math.max(1, row.uploadedCount)}%`;
              const deltaTone = row.blockedCount > 0 ? 'text-slate-400' : 'text-emerald-600';
              return (
                <Link
                  key={row.contentId}
                  href={row.contentHref}
                  className="flex items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-slate-50/60"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="text-admin-primary">
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-slate-900">{row.contentLabel}</div>
                      <div className="text-[10px] text-slate-500">
                        {Math.max(1, row.totalJobs)} Active {index % 2 === 0 ? 'Streams' : 'Threads'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-admin-primary">
                      {row.totalJobs >= 1000 ? `${(row.totalJobs / 1000).toFixed(1)}k` : row.totalJobs}
                    </div>
                    <div className={`text-[10px] font-medium ${deltaTone}`}>{deltaLabel}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      <div className="hidden overflow-x-auto md:block">
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
      <div className="hidden border-t border-slate-50 bg-slate-50/20 p-6 md:block">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">Overall System Load</span>
          <span className="text-xs font-bold text-indigo-600">{overallLoadPercent}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-linear-to-r from-indigo-500 to-indigo-700"
            style={{ width: `${overallLoadPercent}%` }}
          />
        </div>
      </div>
    </section>
  );
}
