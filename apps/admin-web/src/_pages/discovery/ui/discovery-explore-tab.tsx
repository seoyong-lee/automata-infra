'use client';

import { DiscoveryChannelFindSection } from './discovery-channel-find-section';
import { DiscoveryTrendSection } from './discovery-trend-section';

type TrendEnqueue = {
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  data?: { enqueueTrendScoutJob: { message: string } } | null;
  mutate: (vars: { channelId?: string; dryRun?: boolean }) => void;
};

type Props = {
  channelId: string;
  channelProbe: string;
  onChannelProbeChange: (v: string) => void;
  onGoShortlist: () => void;
  trendDryRun: boolean;
  onTrendDryRunChange: (v: boolean) => void;
  enqueueTrendScout: TrendEnqueue;
};

export function DiscoveryExploreTab({
  channelId,
  channelProbe,
  onChannelProbeChange,
  onGoShortlist,
  trendDryRun,
  onTrendDryRunChange,
  enqueueTrendScout,
}: Props) {
  return (
    <div className="space-y-8">
      <DiscoveryChannelFindSection
        channelProbe={channelProbe}
        onChannelProbeChange={onChannelProbeChange}
        onGoShortlist={onGoShortlist}
      />
      <DiscoveryTrendSection
        channelId={channelId}
        trendDryRun={trendDryRun}
        onTrendDryRunChange={onTrendDryRunChange}
        enqueueTrendScout={enqueueTrendScout}
      />
    </div>
  );
}
