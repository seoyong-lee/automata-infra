'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { AdminJob } from '@/entities/admin-job';
import type { YoutubeChannelConfig } from '@/entities/youtube-channel';

type Params = {
  jobs: AdminJob[];
  configuredChannels: YoutubeChannelConfig[];
};

export const useContentOperationsChannelState = ({ jobs, configuredChannels }: Params) => {
  const searchParams = useSearchParams();
  const [manualSelectedChannelId, setSelectedChannelId] = useState('');

  const availableChannels = useMemo(() => {
    return Array.from(
      new Set([
        ...configuredChannels.map((item) => item.channelId),
        ...jobs.map((item) => item.channelId),
      ]),
    ).sort();
  }, [configuredChannels, jobs]);

  const queryChannelId = searchParams.get('channelId');

  const selectedChannel = useMemo(() => {
    if (manualSelectedChannelId && availableChannels.includes(manualSelectedChannelId)) {
      return manualSelectedChannelId;
    }
    if (queryChannelId && availableChannels.includes(queryChannelId)) {
      return queryChannelId;
    }
    return availableChannels[0] || '';
  }, [availableChannels, manualSelectedChannelId, queryChannelId]);

  const channelJobs = useMemo(() => {
    return jobs.filter((job) => job.channelId === selectedChannel);
  }, [jobs, selectedChannel]);

  const selectedChannelConfig = useMemo(() => {
    return configuredChannels.find((item) => item.channelId === selectedChannel);
  }, [configuredChannels, selectedChannel]);

  return {
    availableChannels,
    channelJobs,
    selectedChannel,
    selectedChannelId: selectedChannel,
    selectedChannelConfig,
    setSelectedChannelId,
  };
};
