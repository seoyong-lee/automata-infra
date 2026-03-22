'use client';

import {
  useChannelWatchlistQuery,
  useCreateChannelWatchlistEntryMutation,
  useLatestChannelScoreSnapshotsForChannelQuery,
  useUpdateChannelWatchlistEntryMutation,
  type ChannelScoreSnapshotGql,
} from '@packages/graphql';
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
    <section className="rounded-lg border border-border/80 bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold tracking-tight">관심 채널</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        외부 YouTube 채널 ID를 찾아 추가하면 이 운영 라인 기준으로 추적·스냅샷합니다. 목록은 전역
        탐색 자산이며, 여기서는 선택한 라인과의 관심 관계로 저장됩니다. 스냅샷은 배치
        (channel-evaluation-jobs)로 갱신됩니다.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          type="text"
          value={externalId}
          onChange={(e) => setExternalId(e.target.value)}
          placeholder="YouTube externalChannelId"
          className="min-w-[200px] flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="button"
          className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
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
        <p className="mt-3 text-sm text-muted-foreground">불러오는 중…</p>
      ) : watchlist.isError || snapshots.isError ? (
        <p className="mt-3 text-sm text-destructive">목록을 불러오지 못했습니다.</p>
      ) : entries.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">워치리스트가 비어 있습니다.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {entries.map((w) => {
            const snap = snapByExternalId.get(w.externalChannelId);
            return (
              <li
                key={w.id}
                className="rounded-md border border-border/60 bg-background/50 p-3 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {w.externalChannelId}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {w.status} · 우선순위 {w.priority}
                    </div>
                  </div>
                  {snap ? (
                    <div className="text-right text-xs">
                      <div className="font-medium">
                        overall {(snap.scores.overallScore * 100).toFixed(0)}%
                      </div>
                      <div className="text-muted-foreground">{snap.status}</div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">스냅샷 없음</div>
                  )}
                </div>
                {snap?.rationale?.length ? (
                  <p className="mt-2 text-xs text-muted-foreground">{snap.rationale[0]}</p>
                ) : null}
                {snap?.riskFlags?.length ? (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    {snap.riskFlags.join(', ')}
                  </p>
                ) : null}
                {w.status === 'WATCHING' ? (
                  <button
                    type="button"
                    className="mt-2 rounded-md border border-border px-2 py-1 text-xs font-medium disabled:opacity-50"
                    disabled={updateEntry.isPending}
                    onClick={() => updateEntry.mutate({ watchlistId: w.id, status: 'PAUSED' })}
                  >
                    일시중지
                  </button>
                ) : (
                  <button
                    type="button"
                    className="mt-2 rounded-md border border-border px-2 py-1 text-xs font-medium disabled:opacity-50"
                    disabled={updateEntry.isPending}
                    onClick={() => updateEntry.mutate({ watchlistId: w.id, status: 'WATCHING' })}
                  >
                    추적 재개
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
