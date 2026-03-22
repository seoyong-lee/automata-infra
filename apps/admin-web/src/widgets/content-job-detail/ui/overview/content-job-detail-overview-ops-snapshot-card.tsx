'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';

import type { JobDraftDetail } from '../../model';

type Props = {
  detail?: JobDraftDetail;
  readyAssetCount: number;
  stylePreset: string;
  totalScenes: number;
};

export function ContentJobDetailOverviewOpsSnapshotCard({
  detail,
  readyAssetCount,
  stylePreset,
  totalScenes,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>운영 스냅샷</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border p-4 text-sm">
          <p className="text-xs text-muted-foreground">최근 업로드</p>
          <p className="mt-1 font-medium">{detail?.job.uploadVideoId ?? '아직 없음'}</p>
        </div>
        <div className="rounded-lg border p-4 text-sm">
          <p className="text-xs text-muted-foreground">검수 큐</p>
          <p className="mt-1 font-medium">{detail?.job.reviewAction ?? 'PENDING'}</p>
        </div>
        <div className="rounded-lg border p-4 text-sm">
          <p className="text-xs text-muted-foreground">에셋 준비</p>
          <p className="mt-1 font-medium">
            {readyAssetCount}/{totalScenes || 0}
          </p>
        </div>
        <div className="rounded-lg border p-4 text-sm">
          <p className="text-xs text-muted-foreground">스타일 프리셋</p>
          <p className="mt-1 font-medium">{stylePreset || '-'}</p>
        </div>
      </CardContent>
    </Card>
  );
}
