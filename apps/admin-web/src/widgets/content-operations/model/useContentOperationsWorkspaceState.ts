'use client';

import { useMemo } from 'react';
import { useAdminJobs, type AdminJob } from '@/entities/admin-job';
import { useYoutubeChannelConfigs } from '@/entities/youtube-channel';
import type { ContentCardSummary } from './types';
import { useContentOperationsActions } from './useContentOperationsActions';
import { useContentOperationsChannelState } from './useContentOperationsChannelState';
import { useContentOperationsContentLineState } from './useContentOperationsContentLineState';

const buildContentCards = (
  channelJobs: AdminJob[],
  contentTypes: string[],
): ContentCardSummary[] => {
  return contentTypes.map((contentType) => {
    const contentJobs = channelJobs.filter((job) => job.contentType === contentType);
    return {
      contentType,
      totalJobs: contentJobs.length,
      draftCount: contentJobs.filter((job) => job.status === 'DRAFT').length,
      failedCount: contentJobs.filter((job) => job.status === 'FAILED' || job.status === 'REJECTED')
        .length,
      reviewCount: contentJobs.filter((job) => job.status === 'REVIEW_PENDING').length,
      assetReadyCount: contentJobs.filter(
        (job) =>
          job.status === 'ASSETS_READY' || job.status === 'RENDERED' || job.status === 'UPLOADED',
      ).length,
      uploadReadyCount: contentJobs.filter(
        (job) => job.status === 'RENDERED' || job.status === 'APPROVED',
      ).length,
    };
  });
};

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
  const contentCards = useMemo(
    () => buildContentCards(channelState.channelJobs, contentLineState.contentTypes),
    [channelState.channelJobs, contentLineState.contentTypes],
  );

  return {
    ...actions,
    ...channelState,
    ...contentLineState,
    contentCards,
    configuredChannelsQuery,
    jobsQuery,
  };
};
