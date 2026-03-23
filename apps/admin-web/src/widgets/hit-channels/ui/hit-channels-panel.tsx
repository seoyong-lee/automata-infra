'use client';

import {
  useChannelWatchlistQuery,
  useCreateChannelWatchlistEntryMutation,
  useLatestChannelScoreSnapshotsForChannelQuery,
  useUpdateChannelWatchlistEntryMutation,
  type ChannelScoreSnapshotGql,
} from '@packages/graphql';
import { PauseCircle, PlayCircle, Radar } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

type Props = {
  channelId: string;
};

export function HitChannelsPanel({ channelId }: Props) {
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
          <h2 className="font-admin-display text-xl font-bold text-admin-primary">관심 채널</h2>
          <p className="mt-1 text-xs leading-6 text-admin-text-muted">
            외부 YouTube 채널 ID를 찾아 추가하면 이 운영 라인 기준으로 추적·스냅샷합니다. 목록은
            전역 탐색 자산이며, 여기서는 선택한 라인과의 관심 관계로 저장됩니다. 스냅샷은 배치
            (channel-evaluation-jobs)로 갱신됩니다.
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
          placeholder="YouTube externalChannelId"
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
          추적 추가
        </button>
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-admin-text-muted">불러오는 중…</p>
      ) : watchlist.isError || snapshots.isError ? (
        <p className="mt-3 text-sm text-destructive">목록을 불러오지 못했습니다.</p>
      ) : entries.length === 0 ? (
        <p className="mt-3 text-sm text-admin-text-muted">워치리스트가 비어 있습니다.</p>
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
                      <span>우선순위 {w.priority}</span>
                    </div>
                  </div>
                  {snap ? (
                    <div className="text-right text-xs">
                      <div className="font-bold text-admin-text-strong">
                        overall {(snap.scores.overallScore * 100).toFixed(0)}%
                      </div>
                      <div className="text-admin-text-muted">{snap.status}</div>
                    </div>
                  ) : (
                    <div className="text-xs text-admin-text-muted">스냅샷 없음</div>
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
                  {watching ? '일시중지' : '추적 재개'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
