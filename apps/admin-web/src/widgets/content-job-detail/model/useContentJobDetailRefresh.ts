import type { QueryClient } from '@tanstack/react-query';

export const createContentJobDetailRefresh =
  (queryClient: QueryClient, jobId: string) => async () => {
    await queryClient.invalidateQueries({ queryKey: ['jobDraft', jobId] });
    await queryClient.invalidateQueries({ queryKey: ['jobExecutions', jobId] });
    await queryClient.invalidateQueries({ queryKey: ['jobTimeline', jobId] });
    await queryClient.invalidateQueries({ queryKey: ['adminJobs'] });
  };
