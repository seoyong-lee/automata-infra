'use client';

import { useMemo } from 'react';
import type { AdminJob } from '@/entities/admin-job';
import { quickFilterMeta } from '../consts';
import { matchesQuickFilter } from '../lib';
import type { ContentLineSummary, QuickFilterKey } from './types';

type Params = {
  contentLineJobs: AdminJob[];
  selectedContentType: string;
};

const buildContentLineSummary = (
  contentLineJobs: AdminJob[],
  selectedContentType: string,
): ContentLineSummary => {
  const latestUploadedJob = [...contentLineJobs]
    .filter((job) => job.status === 'UPLOADED')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const latestUpdatedJob = [...contentLineJobs].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  )[0];

  return {
    title: selectedContentType === 'all' ? 'All Content Lines' : selectedContentType,
    totalJobs: contentLineJobs.length,
    failedJobs: contentLineJobs.filter(
      (job) => job.status === 'FAILED' || job.status === 'REJECTED',
    ).length,
    reviewJobs: contentLineJobs.filter((job) => job.status === 'REVIEW_PENDING').length,
    uploadedJobs: contentLineJobs.filter((job) => job.status === 'UPLOADED').length,
    activeVariants: new Set(
      contentLineJobs.map((job) => job.variant).filter((value): value is string => Boolean(value)),
    ).size,
    averageDurationSec:
      contentLineJobs.length > 0
        ? Math.round(
            contentLineJobs.reduce((sum, job) => sum + job.targetDurationSec, 0) /
              contentLineJobs.length,
          )
        : 0,
    latestUploadedAt: latestUploadedJob?.updatedAt ?? null,
    latestUpdatedAt: latestUpdatedJob?.updatedAt ?? null,
  };
};

const buildQuickFilterCounts = (contentLineJobs: AdminJob[]) => {
  return quickFilterMeta.reduce<Record<QuickFilterKey, number>>(
    (acc, item) => {
      acc[item.key] = contentLineJobs.filter((job) =>
        matchesQuickFilter(job.status, item.key),
      ).length;
      return acc;
    },
    { all: 0, review: 0, failed: 0, 'upload-ready': 0 },
  );
};

export const useContentOperationsQueueTab = ({ contentLineJobs, selectedContentType }: Params) => {
  const contentLineSummary = useMemo(
    () => buildContentLineSummary(contentLineJobs, selectedContentType),
    [contentLineJobs, selectedContentType],
  );
  const quickFilterCounts = useMemo(
    () => buildQuickFilterCounts(contentLineJobs),
    [contentLineJobs],
  );

  return {
    contentLineSummary,
    quickFilterCounts,
  };
};
