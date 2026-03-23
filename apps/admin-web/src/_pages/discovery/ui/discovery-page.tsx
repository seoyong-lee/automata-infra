'use client';

import { Suspense } from 'react';

import { CreateSourceItemDialog } from '@/widgets/create-source-item';
import { SavedSourcesPanel } from '@/widgets/saved-sources';
import { AdminPageHeader } from '@/shared/ui/admin-page-header';

import { DiscoveryExploreTab } from './discovery-explore-tab';
import { DiscoveryShortlistTab } from './discovery-shortlist-tab';
import { DiscoveryTabStrip } from './discovery-tab-strip';
import { useDiscoveryPage } from '../model/discovery-page-state';

function DiscoveryPageBody() {
  const {
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
  } = useDiscoveryPage();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="소재 찾기"
        subtitle="외부 채널과 트렌드에서 아이디어를 찾고, 쓸 만한 것만 추린 뒤 저장해 제작 아이템에 연결합니다."
      />
      <DiscoveryTabStrip tab={tab} onTabChange={onTabChange} />

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

        {tab === 'shortlist' ? (
          <DiscoveryShortlistTab
            channelId={channelId}
            items={items}
            contentsLoading={contentsQuery.isLoading}
            onChannelChange={onChannelChange}
          />
        ) : null}

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
    </div>
  );
}

export function DiscoveryPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8">
          <AdminPageHeader title="소재 찾기" subtitle="불러오는 중…" />
        </div>
      }
    >
      <DiscoveryPageBody />
    </Suspense>
  );
}
