'use client';

import { Button } from '@packages/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';

import type { JobDraftDetail } from '../model';

type ContentJobDetailRenderReviewViewProps = {
  detail?: JobDraftDetail;
  onOpenReviews: () => void;
  readyAssetCount: number;
};

export function ContentJobDetailRenderReviewView({
  detail,
  onOpenReviews,
  readyAssetCount,
}: ContentJobDetailRenderReviewViewProps) {
  const totalScenes = detail?.assets.length ?? 0;
  const renderReady = totalScenes > 0 && readyAssetCount === totalScenes;
  const message = renderReady
    ? '씬 에셋이 모두 준비되었습니다. 검수·렌더링은 작업 현황에서 진행할 수 있습니다.'
    : `렌더 전에 에셋을 채워 주세요. (${readyAssetCount}/${totalScenes} 씬 준비)`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>렌더링 및 검수</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
        <Button variant="outline" onClick={onOpenReviews}>
          작업 현황에서 검수하기
        </Button>
      </CardContent>
    </Card>
  );
}
