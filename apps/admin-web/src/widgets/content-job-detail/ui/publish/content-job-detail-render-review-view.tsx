'use client';

import { Button } from '@packages/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';

import type { JobDraftDetail } from '../../model';

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
  const rendered = Boolean(detail?.job.previewS3Key) || Boolean(detail?.job.finalVideoS3Key);
  const message = rendered
    ? '최종 렌더 결과가 준비되었습니다. 작업 현황에서 검수를 진행하세요.'
    : totalScenes > 0 && readyAssetCount === totalScenes
      ? '에셋은 준비되었지만 아직 최종 렌더가 없습니다. 제작 단계에서 Shotstack 렌더를 실행한 뒤 검수로 넘어가세요.'
      : `렌더 전 에셋 준비가 더 필요합니다. (${readyAssetCount}/${totalScenes} 씬 준비)`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>최종 검수</CardTitle>
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
