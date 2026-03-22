'use client';

import { useEnqueueTrendScoutJobMutation } from '@packages/graphql';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { useAdminContents } from '@/entities/admin-content';

import { type DiscoveryTabId, normalizeDiscoveryTab } from '../lib/discovery-tabs';

export function useDiscoveryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const channelId = searchParams.get('channel')?.trim() ?? '';
  const rawTab = searchParams.get('tab');
  const tab = useMemo(() => normalizeDiscoveryTab(rawTab), [rawTab]);

  useEffect(() => {
    if (!rawTab) return;
    const n = normalizeDiscoveryTab(rawTab);
    if (rawTab !== n) {
      const p = new URLSearchParams(searchParams.toString());
      p.set('tab', n);
      router.replace(`/discovery?${p.toString()}`);
    }
  }, [rawTab, router, searchParams]);

  const contentsQuery = useAdminContents({ limit: 100 });
  const items = contentsQuery.data?.items ?? [];
  const queryClient = useQueryClient();
  const createFromUrl = searchParams.get('create') === '1';
  const [createOpenManual, setCreateOpenManual] = useState(false);
  const createSourceOpen = createFromUrl || createOpenManual;
  const [trendDryRun, setTrendDryRun] = useState(false);
  const [channelProbe, setChannelProbe] = useState('');

  const closeCreateSource = () => {
    setCreateOpenManual(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('create');
    const q = params.toString();
    router.replace(q ? `/discovery?${q}` : '/discovery');
  };

  const enqueueTrendScout = useEnqueueTrendScoutJobMutation({
    onSuccess: () => {
      if (channelId) {
        void queryClient.invalidateQueries({
          queryKey: ['agentRunsForChannel', channelId],
        });
      }
    },
  });

  const setQuery = (next: { channel?: string; tab?: DiscoveryTabId }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.channel !== undefined) {
      if (next.channel) {
        params.set('channel', next.channel);
      } else {
        params.delete('channel');
      }
    }
    if (next.tab !== undefined) {
      params.set('tab', next.tab);
    }
    const q = params.toString();
    router.replace(q ? `/discovery?${q}` : '/discovery');
  };

  const onChannelChange = (nextId: string) => {
    setQuery({ channel: nextId });
  };

  const onTabChange = (nextTab: DiscoveryTabId) => {
    setQuery({ tab: nextTab });
  };

  return {
    channelId,
    tab,
    contentsQuery,
    items,
    createSourceOpen,
    setCreateOpenManual,
    closeCreateSource,
    trendDryRun,
    setTrendDryRun,
    channelProbe,
    setChannelProbe,
    enqueueTrendScout,
    onChannelChange,
    onTabChange,
  };
}
