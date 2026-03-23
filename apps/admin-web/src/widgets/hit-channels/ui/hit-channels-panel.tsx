'use client';

import {
  useChannelWatchlistQuery,
  useCreateChannelWatchlistEntryMutation,
  useLatestChannelScoreSnapshotsForChannelQuery,
  useUpdateChannelWatchlistEntryMutation,
  type ChannelScoreSnapshotGql,
} from '@packages/graphql';
import { PauseCircle, PlayCircle, Radar } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

type Props = {
  channelId: string;
};

export function HitChannelsPanel({ channelId }: Props) {
  const t = useTranslations('discovery.watchlist');
  const queryClient = useQueryClient();
  const [externalId, setExternalId] = useState('');
  const watchlist = useChannelWatchlistQuery({ channelId });
  const snapshots = useLatestChannelScoreSnapshotsForChannelQuery({ channelId });

  const snapByExternalId = useMemo(() => {
    const m = new Map<string, ChannelScoreSnapshotGql>();
    for (const s of snapshots.data ?? []) {
      m.set(s.externalChannelId, s);
    }
    return m;
  }, [snapshots.data]);

  const createEntry = useCreateChannelWatchlistEntryMutation({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['channelWatchlist', channelId] });
      void queryClient.invalidateQueries({
        queryKey: ['latestChannelScoreSnapshotsForChannel', channelId],
      });
      setExternalId('');
    },
  });

  const updateEntry = useUpdateChannelWatchlistEntryMutation({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['channelWatchlist', channelId] });
      void queryClient.invalidateQueries({
        queryKey: ['latestChannelScoreSnapshotsForChannel', channelId],
      });
    },
  });

  if (!channelId) {
    return null;
  }

  const entries = watchlist.data ?? [];
  const loading = watchlist.isLoading || snapshots.isLoading;

  return (
    <section className="rounded-xl border border-admin-outline-ghost/15 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-admin-display text-xl font-bold text-admin-primary">{t('title')}</h2>
          <p className="mt-1 text-xs leading-6 text-admin-text-muted">
            {t('description')}
          </p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-xl bg-admin-primary-container/20 text-admin-primary">
          <Radar className="size-5" />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <input
          type="text"
          value={externalId}
          onChange={(e) => setExternalId(e.target.value)}
          placeholder={t('placeholder')}
          className="min-w-[220px] flex-1 rounded-lg border-none bg-admin-surface-section px-4 py-3 text-sm text-admin-text-strong outline-none ring-0 placeholder:text-admin-text-muted focus:ring-2 focus:ring-admin-primary/20"
        />
        <button
          type="button"
          className="rounded-md bg-linear-to-br from-admin-primary to-admin-primary-container px-4 py-3 text-xs font-bold text-white shadow-lg shadow-slate-900/10 disabled:opacity-50"
          disabled={!externalId.trim() || createEntry.isPending}
          onClick={() =>
            createEntry.mutate({
              channelId,
              platform: 'YOUTUBE',
              externalChannelId: externalId.trim(),
              source: 'MANUAL',
            })
          }
        >
          {t('addTracking')}
        </button>
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-admin-text-muted">{t('loading')}</p>
      ) : watchlist.isError || snapshots.isError ? (
        <p className="mt-3 text-sm text-destructive">{t('loadFailed')}</p>
      ) : entries.length === 0 ? (
        <p className="mt-3 text-sm text-admin-text-muted">{t('empty')}</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {entries.map((w) => {
            const snap = snapByExternalId.get(w.externalChannelId);
            const watching = w.status === 'WATCHING';
            return (
              <li
                key={w.id}
                className="rounded-xl border border-admin-outline-ghost/15 bg-admin-surface-base/70 p-4 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-admin-text-muted">
                      {w.externalChannelId}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-admin-text-muted">
                      <span className="rounded-full bg-admin-surface-card px-2 py-1 font-semibold text-admin-text-strong">
                        {w.status}
                      </span>
                      <span>{t('priority', { value: w.priority })}</span>
                    </div>
                  </div>
                  {snap ? (
                    <div className="text-right text-xs">
                      <div className="font-bold text-admin-text-strong">
                        {t('overall', { value: (snap.scores.overallScore * 100).toFixed(0) })}
                      </div>
                      <div className="text-admin-text-muted">{snap.status}</div>
                    </div>
                  ) : (
                    <div className="text-xs text-admin-text-muted">{t('noSnapshot')}</div>
                  )}
                </div>
                {snap?.rationale?.length ? (
                  <p className="mt-3 text-xs leading-6 text-admin-text-muted">
                    {snap.rationale[0]}
                  </p>
                ) : null}
                {snap?.riskFlags?.length ? (
                  <p className="mt-2 text-xs text-amber-600">{snap.riskFlags.join(', ')}</p>
                ) : null}
                <button
                  type="button"
                  className="mt-3 inline-flex items-center gap-2 rounded-md border border-admin-outline-ghost/20 bg-white px-3 py-2 text-xs font-semibold text-admin-text-strong disabled:opacity-50"
                  disabled={updateEntry.isPending}
                  onClick={() =>
                    updateEntry.mutate({
                      watchlistId: w.id,
                      status: watching ? 'PAUSED' : 'WATCHING',
                    })
                  }
                >
                  {watching ? (
                    <PauseCircle className="size-4" />
                  ) : (
                    <PlayCircle className="size-4" />
                  )}
                  {watching ? t('pause') : t('resume')}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
