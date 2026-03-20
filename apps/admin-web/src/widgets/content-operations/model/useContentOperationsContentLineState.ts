'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { AdminJob } from '@/entities/admin-job';

type Params = {
  channelJobs: AdminJob[];
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

const getContentLineJobs = (channelJobs: AdminJob[], selectedContentType: string) => {
  if (selectedContentType === 'all') {
    return channelJobs;
  }
  return channelJobs.filter((job) => job.contentType === selectedContentType);
};

export const useContentOperationsContentLineState = ({ channelJobs }: Params) => {
  const searchParams = useSearchParams();
  const [manualSelectedContentType, setSelectedContentType] = useState('all');
  const queryContentType = searchParams.get('contentType');
  const contentTypes = useMemo(() => getContentTypes(channelJobs), [channelJobs]);
  const selectedContentType = resolveSelectedContentType(
    contentTypes,
    manualSelectedContentType,
    queryContentType,
  );
  const contentLineJobs = useMemo(
    () => getContentLineJobs(channelJobs, selectedContentType),
    [channelJobs, selectedContentType],
  );

  return {
    contentLineJobs,
    contentTypes,
    /** 검색·라인 기준 전체 목록(작업 큐 필터는 「작업 현황」 전용). */
    filteredJobs: contentLineJobs,
    selectedContentType,
    setSelectedContentType,
  };
};
