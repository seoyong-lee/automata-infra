'use client';

import { HitChannelsPanel } from '@/widgets/hit-channels';
import { IdeaCandidatesPanel } from '@/widgets/idea-candidates';

type Props = {
  channelId: string;
};

export function DiscoveryShortlistTab({ channelId }: Props) {
  return (
    <div className="space-y-8">
      {!channelId ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          <strong className="text-foreground">관심 채널</strong>과{' '}
          <strong className="text-foreground">추천 후보</strong>는 운영 라인별 데이터입니다. 위에서{' '}
          <strong className="text-foreground">라인 필터</strong>를 선택하세요.
        </p>
      ) : null}
      {channelId ? <HitChannelsPanel channelId={channelId} /> : null}
      {channelId ? <IdeaCandidatesPanel channelId={channelId} /> : null}
    </div>
  );
}
