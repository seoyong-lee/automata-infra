'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { AdminJob } from '@/entities/admin-job';
import { matchesQuickFilter } from '../lib';
import type { QuickFilterKey } from './types';

type Params = {
  channelJobs: AdminJob[];
};

const isQuickFilterKey = (value: string | null): value is QuickFilterKey => {
  return value === 'all' || value === 'review' || value === 'failed' || value === 'upload-ready';
};

const getContentTypes = (channelJobs: AdminJob[]) => {
  return Array.from(
    new Set(
      channelJobs.map((job) => job.contentType).filter((value): value is string => Boolean(value)),
    ),
  ).sort();
};

const resolveSelectedContentType = (
  contentTypes: string[],
  manualSelectedContentType: string,
  queryContentType: string | null,
) => {
  if (manualSelectedContentType && contentTypes.includes(manualSelectedContentType)) {
    return manualSelectedContentType;
  }
  if (queryContentType && contentTypes.includes(queryContentType)) {
    return queryContentType;
  }
  return 'all';
};

const resolveSelectedQuickFilter = (
  manualSelectedQuickFilter: QuickFilterKey,
  queryFilter: string | null,
): QuickFilterKey => {
  if (manualSelectedQuickFilter !== 'all') {
    return manualSelectedQuickFilter;
  }
  return isQuickFilterKey(queryFilter) ? queryFilter : 'all';
};

const getContentLineJobs = (channelJobs: AdminJob[], selectedContentType: string) => {
  if (selectedContentType === 'all') {
    return channelJobs;
  }
  return channelJobs.filter((job) => job.contentType === selectedContentType);
};
export const useContentOperationsContentLineState = ({ channelJobs }: Params) => {
  const searchParams = useSearchParams();
  const [manualSelectedContentType, setSelectedContentType] = useState('all');
  const [manualSelectedQuickFilter, setSelectedQuickFilter] = useState<QuickFilterKey>('all');
  const queryContentType = searchParams.get('contentType');
  const queryFilter = searchParams.get('filter');
  const contentTypes = useMemo(() => getContentTypes(channelJobs), [channelJobs]);
  const selectedContentType = resolveSelectedContentType(
    contentTypes,
    manualSelectedContentType,
    queryContentType,
  );
  const selectedQuickFilter = resolveSelectedQuickFilter(manualSelectedQuickFilter, queryFilter);
  const contentLineJobs = useMemo(
    () => getContentLineJobs(channelJobs, selectedContentType),
    [channelJobs, selectedContentType],
  );
  const filteredJobs = useMemo(
    () => contentLineJobs.filter((job) => matchesQuickFilter(job.status, selectedQuickFilter)),
    [contentLineJobs, selectedQuickFilter],
  );

  return {
    contentLineJobs,
    contentTypes,
    filteredJobs,
    selectedContentType,
    selectedQuickFilter,
    setSelectedContentType,
    setSelectedQuickFilter,
  };
};
