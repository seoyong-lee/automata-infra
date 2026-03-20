'use client';

type Params = {
  filteredJobsCount: number;
  selectedJobId: string;
};

export const useContentOperationsJobsTab = ({ filteredJobsCount, selectedJobId }: Params) => {
  return {
    hasJobs: filteredJobsCount > 0,
    selectedJobId,
    visibleJobCount: filteredJobsCount,
  };
};
