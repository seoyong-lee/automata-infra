import { fetchSourceItemsForChannel } from '@packages/graphql';
import { useQueries } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useAdminContents } from '@/entities/admin-content';
import { useAdminJobs } from '@/entities/admin-job';

import {
  channelLabelMap,
  countJobsBySourceItem,
  filterMergedRows,
  mergeRowsFromQueries,
  resolveChannelIdsForFilter,
} from '../lib/saved-sources-aggregate';

/** 채널별 소재 쿼리 병합 + 검색·상태 필터. */
export function useSavedSourcesModel(channelFilter: string) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const contentsQuery = useAdminContents({ limit: 200 });
  const catalog = useMemo(() => contentsQuery.data?.items ?? [], [contentsQuery.data?.items]);

  const jobsQuery = useAdminJobs({ limit: 200 });
  const jobs = useMemo(() => jobsQuery.data?.items ?? [], [jobsQuery.data?.items]);

  const jobCountBySource = useMemo(() => countJobsBySourceItem(jobs), [jobs]);

  const channelIds = useMemo(
    () => resolveChannelIdsForFilter(catalog, channelFilter),
    [catalog, channelFilter],
  );

  const labelById = useMemo(() => channelLabelMap(catalog), [catalog]);

  const sourceQueries = useQueries({
    queries: channelIds.map((channelId) => ({
      queryKey: ['sourceItemsForChannel', channelId] as const,
      queryFn: () => fetchSourceItemsForChannel(channelId),
      enabled: channelIds.length > 0 && !contentsQuery.isLoading,
    })),
  });

  const loading = sourceQueries.some((r) => r.isPending || r.isLoading);
  const loadError = sourceQueries.find((r) => r.error)?.error;

  const merged = useMemo(() => {
    const lists = sourceQueries.map((r) => r.data ?? []);
    return mergeRowsFromQueries(channelIds, lists, labelById);
  }, [channelIds, sourceQueries, labelById]);

  const filtered = useMemo(
    () => filterMergedRows(merged, search, statusFilter),
    [merged, search, statusFilter],
  );

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    merged,
    filtered,
    loading,
    loadError,
    jobCountBySource,
  };
}
