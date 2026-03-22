'use client';

import { CreateSourceItemDialog } from '@/widgets/create-source-item';
import { SavedSourcesPanel } from '@/widgets/saved-sources';
import type { AdminContent } from '@/entities/admin-content';

import type { DiscoveryTabId } from '../lib/discovery-tabs';
import { DiscoveryExploreTab } from './discovery-explore-tab';
import { DiscoveryShortlistTab } from './discovery-shortlist-tab';

type TrendEnqueue = {
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  data?: { enqueueTrendScoutJob: { message: string } } | null;
  mutate: (vars: { channelId?: string; dryRun?: boolean }) => void;
};

type Props = {
  tab: DiscoveryTabId;
  channelId: string;
  items: AdminContent[];
  createSourceOpen: boolean;
  setCreateOpenManual: (v: boolean) => void;
  closeCreateSource: () => void;
  trendDryRun: boolean;
  setTrendDryRun: (v: boolean) => void;
  channelProbe: string;
  setChannelProbe: (v: string) => void;
  enqueueTrendScout: TrendEnqueue;
  onTabChange: (nextTab: DiscoveryTabId) => void;
};

export function DiscoveryTabPanels({
  tab,
  channelId,
  items,
  createSourceOpen,
  setCreateOpenManual,
  closeCreateSource,
  trendDryRun,
  setTrendDryRun,
  channelProbe,
  setChannelProbe,
  enqueueTrendScout,
  onTabChange,
}: Props) {
  return (
    <>
      <div className="space-y-8" role="tabpanel">
        {tab === 'explore' ? (
          <DiscoveryExploreTab
            channelId={channelId}
            channelProbe={channelProbe}
            onChannelProbeChange={setChannelProbe}
            onGoShortlist={() => onTabChange('shortlist')}
            trendDryRun={trendDryRun}
            onTrendDryRunChange={setTrendDryRun}
            enqueueTrendScout={enqueueTrendScout}
          />
        ) : null}

        {tab === 'shortlist' ? <DiscoveryShortlistTab channelId={channelId} /> : null}

        {tab === 'saved' ? (
          <SavedSourcesPanel
            channelFilter={channelId}
            onCreateClick={() => setCreateOpenManual(true)}
          />
        ) : null}
      </div>

      <CreateSourceItemDialog
        open={createSourceOpen}
        onClose={closeCreateSource}
        channels={items}
      />
    </>
  );
}
