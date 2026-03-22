'use client';

import { Button } from '@packages/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';
import { getErrorMessage } from '@packages/utils';
import Link from 'next/link';

import type { JobDraftDetail } from '../../model';

const getPublishModeLabel = (detail?: JobDraftDetail) =>
  (detail?.contentBrief?.autoPublish ?? detail?.job.autoPublish)
    ? '렌더 후 자동 공개'
    : '공개 전 수동 검수';

export function ShippingPrepEnqueueCard({
  detail,
  channelOk,
  queueHref,
  scheduleHref,
  contentId,
  isEnqueueing,
  enqueueError,
  onEnqueueToChannel,
  onOpenReviews,
}: {
  detail?: JobDraftDetail;
  channelOk: boolean;
  queueHref: string | null;
  scheduleHref: string | null;
  contentId?: string | null;
  isEnqueueing: boolean;
  enqueueError: unknown;
  onEnqueueToChannel: (contentId: string) => void;
  onOpenReviews: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>출고 준비</CardTitle>
        <p className="text-sm text-muted-foreground">
          제작·검수가 끝나면 이 채널의 <strong>출고 대기 큐</strong>에 올립니다. 실제 업로드·예약은
          채널의 <strong>예약·발행</strong> 화면에서 진행합니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {getPublishModeLabel(detail)} · 업로드 상태 {detail?.job.uploadStatus ?? '미시작'}
          {detail?.job.uploadVideoId ? ` · 영상 ID ${detail.job.uploadVideoId}` : ''}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!channelOk || isEnqueueing}
            onClick={() => channelOk && contentId && onEnqueueToChannel(contentId)}
          >
            {isEnqueueing ? '처리 중…' : '채널 출고 큐에 추가'}
          </Button>
          {queueHref ? (
            <Link
              href={queueHref}
              className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent"
            >
              이 채널 출고 큐 열기
            </Link>
          ) : null}
          {scheduleHref ? (
            <Link
              href={scheduleHref}
              className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent"
            >
              예약·발행 열기
            </Link>
          ) : null}
          <Button variant="outline" onClick={onOpenReviews}>
            작업 현황
          </Button>
        </div>
        {!channelOk ? (
          <p className="text-sm text-amber-600 dark:text-amber-500">
            채널에 연결된 제작 아이템만 출고 큐에 넣을 수 있습니다. 개요에서 채널을 연결하거나
            허브에서 연결하세요.
          </p>
        ) : null}
        {enqueueError ? (
          <p className="text-sm text-destructive">{getErrorMessage(enqueueError)}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
