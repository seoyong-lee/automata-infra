'use client';

import {
  useIdeaCandidatesForChannelQuery,
  usePromoteIdeaCandidateToSourceMutation,
  useRejectIdeaCandidateMutation,
} from '@packages/graphql';
import { useQueryClient } from '@tanstack/react-query';

type Props = {
  channelId: string;
};

export function IdeaCandidatesPanel({ channelId }: Props) {
  const queryClient = useQueryClient();
  const list = useIdeaCandidatesForChannelQuery({ channelId });
  const promote = usePromoteIdeaCandidateToSourceMutation({
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['ideaCandidatesForChannel', channelId],
      });
      void queryClient.invalidateQueries({ queryKey: ['sourceItemsForChannel', channelId] });
    },
  });
  const reject = useRejectIdeaCandidateMutation({
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['ideaCandidatesForChannel', channelId],
      });
    },
  });

  if (!channelId) {
    return null;
  }

  const items = list.data ?? [];

  return (
    <section className="rounded-lg border border-border/80 bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold tracking-tight">자동 발굴 후보</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        에이전트가 제안한 소재 후보입니다. 채택 시 소재(SourceItem)로 승격됩니다.
      </p>
      {list.isLoading ? (
        <p className="mt-3 text-sm text-muted-foreground">불러오는 중…</p>
      ) : list.isError ? (
        <p className="mt-3 text-sm text-destructive">목록을 불러오지 못했습니다.</p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">후보가 없습니다.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((c) => (
            <li
              key={c.id}
              className="rounded-md border border-border/60 bg-background/50 p-3 text-sm"
            >
              <div className="font-medium">{c.title}</div>
              {c.hook ? <div className="mt-1 text-muted-foreground">{c.hook}</div> : null}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>점수 {(c.score * 100).toFixed(0)}%</span>
                <span>·</span>
                <span>{c.status}</span>
              </div>
              {c.status === 'PENDING' ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
                    disabled={promote.isPending}
                    onClick={() => promote.mutate({ ideaCandidateId: c.id })}
                  >
                    소재로 승격
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                    disabled={reject.isPending}
                    onClick={() => reject.mutate({ ideaCandidateId: c.id })}
                  >
                    거절
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
