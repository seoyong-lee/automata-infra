'use client';

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
          <strong className="text-admin-text-strong">관심 채널</strong>과{' '}
          <strong className="text-admin-text-strong">추천 후보</strong>는 운영 라인별 데이터입니다.
          위 <strong className="text-admin-text-strong">라인 필터</strong>에서 라인을 선택하세요.
        </p>
      ) : null}
      {channelId ? <HitChannelsPanel channelId={channelId} /> : null}
      {channelId ? <IdeaCandidatesPanel channelId={channelId} /> : null}
    </div>
  );
}
