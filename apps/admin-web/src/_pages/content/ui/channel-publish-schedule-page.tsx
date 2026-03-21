'use client';

import { useParams } from 'next/navigation';

import { ContentChannelSubnav } from '@/widgets/content-channel';
import { AdminPageBack } from '@/shared/ui/admin-page-back';
import { AdminPageHeader } from '@/shared/ui/admin-page-header';

export function ChannelPublishSchedulePage() {
  const params = useParams();
  const contentId = typeof params.contentId === 'string' ? params.contentId : '';

  return (
    <div className="space-y-8">
      <AdminPageBack href={`/content/${encodeURIComponent(contentId)}/jobs`} label="채널로" />
      <ContentChannelSubnav contentId={contentId} />
      <AdminPageHeader
        title="예약·발행 일정"
        subtitle="캘린더·리스트 뷰와 재예약·재시도는 다음 단계에서 연결합니다."
      />
      <p className="text-sm text-muted-foreground">
        출고 큐에서 예약한 항목이 여기에 표시될 예정입니다. 현재는 채널별 출고 큐만 사용할 수
        있습니다.
      </p>
    </div>
  );
}
