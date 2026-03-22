'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';

import type { JobDraftDetail } from '../../model';

type Props = {
  detail?: JobDraftDetail;
};

export function ContentJobDetailOverviewAdoptedCard({ detail }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>채택 라인 (승인 스냅샷)</CardTitle>
        <CardDescription>
          각 단계에서 &quot;이 실행을 채택&quot;으로 기록한 executionId입니다. 파이프라인 입력은
          추후 이 포인터를 우선합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3 text-sm">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">토픽 플랜</p>
          <p className="mt-1 font-mono text-xs break-all">
            {detail?.job.approvedTopicExecutionId ?? '—'}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">씬 JSON</p>
          <p className="mt-1 font-mono text-xs break-all">
            {detail?.job.approvedSceneExecutionId ?? '—'}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">에셋 생성</p>
          <p className="mt-1 font-mono text-xs break-all">
            {detail?.job.approvedAssetExecutionId ?? '—'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
