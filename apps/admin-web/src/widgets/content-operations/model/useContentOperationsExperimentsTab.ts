'use client';

import { useMemo } from 'react';
import type { AdminJob } from '@/entities/admin-job';
import { experimentTracks } from '../consts';
import { estimateExperimentScore } from '../lib';
import type { CompareCandidate } from './types';

type Params = {
  filteredJobs: AdminJob[];
};

const buildCompareCandidates = (filteredJobs: AdminJob[]): CompareCandidate[] => {
  return filteredJobs.slice(0, 3).map((job, index) => ({
    job,
    label: job.variant || ['variant-a', 'variant-b', 'variant-c'][index] || 'variant',
    score: estimateExperimentScore({
      status: job.status,
      autoPublish: job.autoPublish,
      retryCount: job.retryCount,
    }),
    renderPath:
      job.status === 'UPLOADED' || job.status === 'RENDERED'
        ? 'scene-package -> shotstack'
        : 'scene-package -> assets -> render',
  }));
};

export const useContentOperationsExperimentsTab = ({ filteredJobs }: Params) => {
  const compareCandidates = useMemo(() => buildCompareCandidates(filteredJobs), [filteredJobs]);

  return {
    compareCandidates,
    experimentTracks,
  };
};
