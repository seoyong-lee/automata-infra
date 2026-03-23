'use client';

import { useTranslations } from 'next-intl';

import type { AdminContent } from '@/entities/admin-content';
import { HitChannelsPanel } from '@/widgets/hit-channels';
import { IdeaCandidatesPanel } from '@/widgets/idea-candidates';

import { DiscoveryLineFilterRow } from './discovery-line-filter-row';

type Props = {
  channelId: string;
  items: AdminContent[];
  contentsLoading: boolean;
  onChannelChange: (nextId: string) => void;
};

export function DiscoveryShortlistTab({
  channelId,
  items,
  contentsLoading,
  onChannelChange,
}: Props) {
  const t = useTranslations('discovery.shortlist');

  return (
    <div className="space-y-8">
      <DiscoveryLineFilterRow
        channelId={channelId}
        items={items}
        isLoading={contentsLoading}
        onChannelChange={onChannelChange}
      />
      {!channelId ? (
        <p className="rounded-xl border border-dashed border-admin-outline-ghost/30 bg-admin-surface-base px-5 py-4 text-sm text-admin-text-muted">
          {t('noLineSelected')}
        </p>
      ) : null}
      {channelId ? <HitChannelsPanel channelId={channelId} /> : null}
      {channelId ? <IdeaCandidatesPanel channelId={channelId} /> : null}
    </div>
  );
}
