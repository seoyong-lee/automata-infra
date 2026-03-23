'use client';

import {
  useIdeaCandidatesForChannelQuery,
  usePromoteIdeaCandidateToSourceMutation,
  useRejectIdeaCandidateMutation,
} from '@packages/graphql';
import { useQueryClient } from '@tanstack/react-query';
import { Lightbulb, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

type Props = {
  channelId: string;
};

export function IdeaCandidatesPanel({ channelId }: Props) {
  const t = useTranslations('discovery.candidates');
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
    <section className="rounded-xl border border-admin-outline-ghost/15 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-admin-display text-xl font-bold text-admin-primary">{t('title')}</h2>
          <p className="mt-1 text-xs leading-6 text-admin-text-muted">
            {t('description')}
          </p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-xl bg-admin-primary-container/20 text-admin-primary">
          <Lightbulb className="size-5" />
        </div>
      </div>

      {list.isLoading ? (
        <p className="mt-4 text-sm text-admin-text-muted">{t('loading')}</p>
      ) : list.isError ? (
        <p className="mt-4 text-sm text-destructive">{t('loadFailed')}</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-admin-text-muted">{t('empty')}</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-admin-outline-ghost/15 bg-admin-surface-base/70 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-full bg-admin-primary-container/20 text-admin-primary">
                      <Sparkles className="size-4" />
                    </div>
                    <div className="text-sm font-bold text-admin-text-strong">{c.title}</div>
                  </div>
                  {c.hook ? (
                    <div className="mt-2 text-sm leading-6 text-admin-text-muted">{c.hook}</div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-admin-text-muted">
                    <span className="rounded-full bg-white px-2 py-1 font-semibold text-admin-text-strong">
                      {t('score', { value: (c.score * 100).toFixed(0) })}
                    </span>
                    <span>{c.status}</span>
                  </div>
                </div>
                {c.status === 'PENDING' ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-md bg-linear-to-br from-admin-primary to-admin-primary-container px-3 py-2 text-xs font-bold text-white shadow-lg shadow-slate-900/10 disabled:opacity-50"
                      disabled={promote.isPending}
                      onClick={() => promote.mutate({ ideaCandidateId: c.id })}
                    >
                      {t('promote')}
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-admin-outline-ghost/20 bg-white px-3 py-2 text-xs font-semibold text-admin-text-strong disabled:opacity-50"
                      disabled={reject.isPending}
                      onClick={() => reject.mutate({ ideaCandidateId: c.id })}
                    >
                      {t('reject')}
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
