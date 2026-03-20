'use client';

import { useMemo } from 'react';
import type { AdminJob } from '@/entities/admin-job';
import type { YoutubeChannelConfig } from '@/entities/youtube-channel';
import type { ContentCardSummary } from './types';

type Params = {
  channelJobs: AdminJob[];
  contentTypes: string[];
  selectedChannel: string;
  selectedChannelConfig?: YoutubeChannelConfig;
};

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

export const useContentOperationsScopeTab = ({
  channelJobs,
  contentTypes,
  selectedChannel,
  selectedChannelConfig,
}: Params) => {
  const contentCards = useMemo(
    () => buildContentCards(channelJobs, contentTypes),
    [channelJobs, contentTypes],
  );

  return {
    contentCards,
    selectedChannel,
    selectedChannelConfig,
  };
};
