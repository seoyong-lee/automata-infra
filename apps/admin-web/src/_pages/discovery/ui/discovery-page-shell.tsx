'use client';

import type { AdminContent } from '@/entities/admin-content';
import { AdminPageHeader } from '@/shared/ui/admin-page-header';

import type { DiscoveryTabId } from '../lib/discovery-tabs';
import { DiscoveryLineFilterRow } from './discovery-line-filter-row';
import { DiscoveryTabPanels } from './discovery-tab-panels';
import { DiscoveryTabStrip } from './discovery-tab-strip';

type ContentsQuery = {
  isLoading: boolean;
};

type TrendEnqueue = {
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  data?: { enqueueTrendScoutJob: { message: string } } | null;
  mutate: (vars: { channelId?: string; dryRun?: boolean }) => void;
};

export type DiscoveryPageShellProps = {
  channelId: string;
  tab: DiscoveryTabId;
  contentsQuery: ContentsQuery;
  items: AdminContent[];
  createSourceOpen: boolean;
  setCreateOpenManual: (v: boolean) => void;
  closeCreateSource: () => void;
  trendDryRun: boolean;
  setTrendDryRun: (v: boolean) => void;
  channelProbe: string;
  setChannelProbe: (v: string) => void;
  enqueueTrendScout: TrendEnqueue;
  onChannelChange: (nextId: string) => void;
  onTabChange: (nextTab: DiscoveryTabId) => void;
};

export function DiscoveryPageShell({
  channelId,
  tab,
  contentsQuery,
  items,
  createSourceOpen,
  setCreateOpenManual,
  closeCreateSource,
  trendDryRun,
  setTrendDryRun,
  channelProbe,
  setChannelProbe,
  enqueueTrendScout,
  onChannelChange,
  onTabChange,
}: DiscoveryPageShellProps) {
  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="소재 찾기"
        subtitle="외부 채널과 트렌드에서 아이디어를 찾고, 쓸 만한 것만 추린 뒤 저장해 제작 아이템에 연결합니다."
      />
      <DiscoveryLineFilterRow
        channelId={channelId}
        items={items}
        isLoading={contentsQuery.isLoading}
        onChannelChange={onChannelChange}
      />
      <DiscoveryTabStrip tab={tab} onTabChange={onTabChange} />
      <DiscoveryTabPanels
        tab={tab}
        channelId={channelId}
        items={items}
        createSourceOpen={createSourceOpen}
        setCreateOpenManual={setCreateOpenManual}
        closeCreateSource={closeCreateSource}
        trendDryRun={trendDryRun}
        setTrendDryRun={setTrendDryRun}
        channelProbe={channelProbe}
        setChannelProbe={setChannelProbe}
        enqueueTrendScout={enqueueTrendScout}
        onTabChange={onTabChange}
      />
    </div>
  );
}
