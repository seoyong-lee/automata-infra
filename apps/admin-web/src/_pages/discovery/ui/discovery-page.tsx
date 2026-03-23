'use client';

import { Button } from '@packages/ui/button';
import { useTranslations } from 'next-intl';
import { Suspense } from 'react';

import { CreateSourceItemDialog } from '@/widgets/create-source-item';
import { SavedSourcesPanel } from '@/widgets/saved-sources';
import { AdminPageHeader } from '@/shared/ui/admin-page-header';

import { DiscoveryExploreTab } from './discovery-explore-tab';
import { DiscoveryShortlistTab } from './discovery-shortlist-tab';
import { DiscoveryTabStrip } from './discovery-tab-strip';
import { useDiscoveryPage } from '../model/discovery-page-state';

function DiscoveryPageBody() {
  const t = useTranslations('discovery.hero');
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
          <span>{t('module')}</span>
          <span className="size-1 rounded-full bg-admin-outline-ghost" />
          <span>{t('exploreTag')}</span>
        </div>
      ),
      title: t('exploreTitle'),
      subtitle: t('exploreSubtitle'),
    },
    shortlist: {
      eyebrow: (
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-admin-text-muted">
          <span>{t('module')}</span>
          <span className="size-1 rounded-full bg-admin-outline-ghost" />
          <span>{t('shortlistTag')}</span>
        </div>
      ),
      title: t('shortlistTitle'),
      subtitle: t('shortlistSubtitle'),
    },
    saved: {
      eyebrow: (
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-admin-text-muted">
          <span>{t('module')}</span>
          <span className="size-1 rounded-full bg-admin-outline-ghost" />
          <span>{t('savedIdeasTag')}</span>
        </div>
      ),
      title: t('savedTitle'),
      subtitle: t('savedSubtitle'),
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
              {t('createNew')}
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
