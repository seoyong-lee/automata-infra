'use client';

import { Button } from '@packages/ui/button';
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

  const heroByTab = {
    explore: {
      eyebrow: (
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-admin-text-muted">
          <span>Discovery Module</span>
          <span className="size-1 rounded-full bg-admin-outline-ghost" />
          <span>Explore</span>
        </div>
      ),
      title: '소재 찾기',
      subtitle:
        '외부 채널과 트렌드 데이터를 분석해 제작에 필요한 아이디어를 탐색하고, 후보를 선별한 뒤 저장해 운영 라인에 연결합니다.',
    },
    shortlist: {
      eyebrow: (
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-admin-text-muted">
          <span>Discovery Module</span>
          <span className="size-1 rounded-full bg-admin-outline-ghost" />
          <span>Shortlist</span>
        </div>
      ),
      title: '후보 검토',
      subtitle:
        '선택한 운영 라인 기준으로 관심 채널과 추천 후보를 비교하면서 실제로 저장할 만한 아이디어만 좁혀갑니다.',
    },
    saved: {
      eyebrow: (
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-admin-text-muted">
          <span>Discovery Module</span>
          <span className="size-1 rounded-full bg-admin-outline-ghost" />
          <span>Saved Ideas</span>
        </div>
      ),
      title: '저장한 아이디어',
      subtitle:
        '저장한 아이디어를 빠르게 검색하고, 상태를 확인한 뒤 바로 제작 아이템으로 이어집니다.',
    },
  } as const;
  const hero = heroByTab[tab];

  return (
    <div className="space-y-10">
      <AdminPageHeader
        eyebrow={hero.eyebrow}
        title={hero.title}
        subtitle={hero.subtitle}
        actions={
          tab === 'saved' ? (
            <Button
              type="button"
              className="h-11 rounded-md bg-linear-to-br from-admin-primary to-admin-primary-container px-5 text-sm font-bold text-white shadow-lg shadow-slate-900/10"
              onClick={() => setCreateOpenManual(true)}
            >
              + 새 소재 만들기
            </Button>
          ) : null
        }
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

        {tab === 'saved' ? <SavedSourcesPanel channelFilter={channelId} /> : null}
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
