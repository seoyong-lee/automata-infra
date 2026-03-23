'use client';

import type { SourceItemGql } from '@packages/graphql';
import { Button } from '@packages/ui/button';
import { ArrowRight, Eye, Film, Shapes, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

import type { MergedRow } from '../types';

function statusLabel(status: SourceItemGql['status'], t: ReturnType<typeof useTranslations>): string {
  switch (status) {
    case 'IDEATING':
      return t('ideating');
    case 'READY_FOR_DISTRIBUTION':
      return t('ready');
    case 'ARCHIVED':
      return t('archived');
    default:
      return status;
  }
}

function statusTone(status: SourceItemGql['status']): string {
  switch (status) {
    case 'READY_FOR_DISTRIBUTION':
      return 'bg-emerald-50 text-emerald-700';
    case 'ARCHIVED':
      return 'bg-slate-100 text-slate-500';
    case 'IDEATING':
    default:
      return 'bg-amber-50 text-amber-700';
  }
}

function channelTone(channelLabel: string): string {
  const index = channelLabel.length % 3;
  if (index === 0) return 'bg-rose-50 text-rose-600';
  if (index === 1) return 'bg-blue-50 text-blue-600';
  return 'bg-violet-50 text-violet-600';
}

type Props = {
  rows: MergedRow[];
  jobCountBySource: Record<string, number>;
  onOpenDetail: (id: string) => void;
};

export function SavedSourcesTable({ rows, jobCountBySource, onOpenDetail }: Props) {
  const t = useTranslations('discovery.savedIdeas');
  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-admin-outline-ghost/15 bg-white">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="bg-admin-surface-base/80 text-left text-[10px] font-black uppercase tracking-[0.22em] text-admin-text-muted">
            <th className="px-6 py-4">{t('tableTitle')}</th>
            <th className="px-6 py-4 text-center">{t('tableChannel')}</th>
            <th className="px-6 py-4">{t('tableStatus')}</th>
            <th className="px-6 py-4">{t('tableLinkedJobs')}</th>
            <th className="px-6 py-4">{t('tableUpdated')}</th>
            <th className="px-6 py-4 text-right">{t('tableActions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-admin-outline-ghost/10">
          {rows.map((row) => {
            const s = row.source;
            const cnt = jobCountBySource[s.id] ?? 0;
            const preview =
              s.masterHook?.trim() || s.sourceNotes?.trim() || t('noMemo');
            return (
              <tr
                key={`${row.channelId}-${s.id}`}
                className="group transition-colors hover:bg-admin-surface-base/60"
              >
                <td className="px-6 py-5">
                  <div className="flex max-w-[320px] flex-col">
                    <span className="text-sm font-bold text-admin-primary">{s.topic}</span>
                    <span className="mt-1 line-clamp-2 text-[11px] text-admin-text-muted">
                      {preview}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-5 text-center">
                  <span
                    className={`inline-flex size-8 items-center justify-center rounded-full ${channelTone(row.channelLabel)}`}
                  >
                    {row.channelLabel ? (
                      row.channelLabel.slice(0, 1).toUpperCase()
                    ) : (
                      <Film className="size-4" />
                    )}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone(s.status)}`}
                  >
                    <span className="size-1.5 rounded-full bg-current opacity-80" />
                    {statusLabel(s.status, t)}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2 text-xs text-admin-text-muted">
                    <div className="flex -space-x-2">
                      <span className="flex size-6 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[10px] font-bold text-slate-700">
                        <Shapes className="size-3" />
                      </span>
                      <span className="flex size-6 items-center justify-center rounded-full border-2 border-white bg-slate-300 text-[10px] font-bold text-slate-700">
                        <Sparkles className="size-3" />
                      </span>
                    </div>
                    <span className="tabular-nums">{t('linkedJobs', { count: cnt })}</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-xs text-admin-text-muted">
                  {new Date(s.updatedAt).toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex justify-end gap-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 rounded-md px-3 text-admin-text-muted hover:bg-admin-primary/10 hover:text-admin-primary"
                      onClick={() => onOpenDetail(s.id)}
                    >
                      <Eye className="mr-1.5 size-4" />
                      {t('view')}
                    </Button>
                    <Link
                      href={`/content/${encodeURIComponent(row.channelId)}/jobs/new`}
                      className="inline-flex h-9 items-center justify-center rounded-md bg-admin-primary/10 px-3 text-[11px] font-bold text-admin-primary transition-colors hover:bg-admin-primary hover:text-white"
                    >
                      {t('createInChannel')}
                      <ArrowRight className="ml-1.5 size-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
