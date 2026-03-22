'use client';

import { Badge } from '@packages/ui/badge';
import { Button } from '@packages/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';
import type { PublishPlatform, PublishTarget, PublishTargetStatus } from '@packages/graphql';
import { getErrorMessage } from '@packages/utils';

const PLATFORM_LABEL: Record<PublishPlatform, string> = {
  YOUTUBE: 'YouTube',
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
};

function statusBadgeClass(status: PublishTargetStatus): string {
  switch (status) {
    case 'PUBLISHED':
      return 'border-transparent bg-emerald-600/15 text-emerald-800 dark:text-emerald-300';
    case 'FAILED':
    case 'SKIPPED':
      return 'border-transparent bg-destructive/15 text-destructive';
    case 'PUBLISHING':
    case 'SCHEDULED':
      return 'border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-300';
    default:
      return 'border-border text-muted-foreground';
  }
}

export function ShippingPrepOrchestrationCard({
  channelOk,
  publishTargets,
  targetsLoading,
  isRunningOrchestration,
  orchestrationError,
  onRunPublishOrchestration,
}: {
  channelOk: boolean;
  publishTargets: PublishTarget[];
  targetsLoading: boolean;
  isRunningOrchestration: boolean;
  orchestrationError: unknown;
  onRunPublishOrchestration: () => void;
}) {
  const busy = isRunningOrchestration || targetsLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle>플랫폼 출고 실행</CardTitle>
        <p className="text-sm text-muted-foreground">
          업로드가 끝난 뒤 YouTube 등 대상별로 상태를 갱신합니다. 채널에 연결된 작업만 실행할 수
          있습니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {targetsLoading ? (
          <p className="text-sm text-muted-foreground">출고 대상 불러오는 중…</p>
        ) : publishTargets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            아직 등록된 출고 대상이 없습니다. 위에서 채널 출고 큐에 추가하거나, 실행 시 기본 대상이
            만들어질 수 있습니다.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {publishTargets.map((t) => (
              <li
                key={t.publishTargetId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
              >
                <span className="font-medium">{PLATFORM_LABEL[t.platform] ?? t.platform}</span>
                <Badge className={statusBadgeClass(t.status)} variant="outline">
                  {t.status}
                </Badge>
                {t.externalUrl ? (
                  <a
                    href={t.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full text-xs text-primary underline-offset-4 hover:underline"
                  >
                    링크 열기
                  </a>
                ) : null}
                {t.publishError ? (
                  <p className="w-full text-xs text-destructive">{t.publishError}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!channelOk || busy}
            onClick={onRunPublishOrchestration}
            variant="secondary"
          >
            {isRunningOrchestration ? '출고 처리 중…' : '출고 오케스트레이션 실행'}
          </Button>
        </div>
        {!channelOk ? (
          <p className="text-sm text-amber-600 dark:text-amber-500">
            채널에 연결된 제작 아이템에서만 실행할 수 있습니다.
          </p>
        ) : null}
        {orchestrationError ? (
          <p className="text-sm text-destructive">{getErrorMessage(orchestrationError)}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
