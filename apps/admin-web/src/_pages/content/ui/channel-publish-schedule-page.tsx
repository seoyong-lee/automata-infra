'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';

import { useAdminContents } from '@/entities/admin-content';
import { ContentChannelSubnav } from '@/widgets/content-channel';
import { AdminPageHeader } from '@/shared/ui/admin-page-header';

export function ChannelPublishSchedulePage() {
  const params = useParams();
  const contentId = typeof params.contentId === 'string' ? params.contentId : '';
  const contentsQuery = useAdminContents({ limit: 200 });
  const label = useMemo(() => {
    return contentsQuery.data?.items.find((c) => c.contentId === contentId)?.label;
  }, [contentsQuery.data?.items, contentId]);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <AdminPageHeader
          backHref="/content"
          eyebrow={
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/content" className="hover:text-foreground">
                채널
              </Link>
              <span className="text-muted-foreground/70">/</span>
              <span className="text-foreground">{(label ?? contentId) || '—'}</span>
            </div>
          }
          title={
            label ? `「${label}」의 예약·발행` : contentId ? '이 채널의 예약·발행' : '예약·발행'
          }
          subtitle="캘린더·리스트 뷰와 재예약·재시도는 다음 단계에서 연결합니다."
        />
      </div>

      <ContentChannelSubnav contentId={contentId} />

      <p className="text-sm text-muted-foreground">
        출고 큐에서 예약한 항목이 여기에 표시될 예정입니다. 현재는 채널별 출고 큐만 사용할 수
        있습니다.
      </p>
    </div>
  );
}
