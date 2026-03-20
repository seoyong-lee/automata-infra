'use client';

import { useMemo, useState } from 'react';
import type { AdminJob } from '@/entities/admin-job';

type Params = {
  filteredJobs: AdminJob[];
};

export const useContentOperationsJobSelection = ({ filteredJobs }: Params) => {
  const [manualSelectedJobId, setSelectedJobId] = useState('');

  const selectedJobId = useMemo(() => {
    if (manualSelectedJobId && filteredJobs.some((job) => job.jobId === manualSelectedJobId)) {
      return manualSelectedJobId;
    }
    return filteredJobs[0]?.jobId ?? '';
  }, [filteredJobs, manualSelectedJobId]);

  const selectedJob = useMemo(() => {
    return filteredJobs.find((job) => job.jobId === selectedJobId) ?? null;
  }, [filteredJobs, selectedJobId]);

  return {
    selectedJob,
    selectedJobId,
    setSelectedJobId,
  };
};
