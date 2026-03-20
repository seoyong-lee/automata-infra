'use client';

import { useAdminJobs } from '@/entities/admin-job';
import { useYoutubeChannelConfigs } from '@/entities/youtube-channel';
import { useContentOperationsActions } from './useContentOperationsActions';
import { useContentOperationsChannelState } from './useContentOperationsChannelState';
import { useContentOperationsContentLineState } from './useContentOperationsContentLineState';
import { useContentOperationsJobSelection } from './useContentOperationsJobSelection';

export const useContentOperationsWorkspaceState = () => {
  const configuredChannelsQuery = useYoutubeChannelConfigs();
  const jobsQuery = useAdminJobs({ limit: 100 });
  const jobs = jobsQuery.data?.items ?? [];
  const configuredChannels = configuredChannelsQuery.data ?? [];
  const actions = useContentOperationsActions();
  const channelState = useContentOperationsChannelState({ jobs, configuredChannels });
  const contentLineState = useContentOperationsContentLineState({
    channelJobs: channelState.channelJobs,
  });
  const jobSelection = useContentOperationsJobSelection({
    filteredJobs: contentLineState.filteredJobs,
  });

  return {
    ...actions,
    ...channelState,
    ...contentLineState,
    ...jobSelection,
    configuredChannelsQuery,
    jobsQuery,
  };
};
