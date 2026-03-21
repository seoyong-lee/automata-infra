'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';

import { ExperimentOption, JobDraftDetail } from '../model';

type ContentJobDetailOverviewViewProps = {
  detail?: JobDraftDetail;
  experimentOptions: ExperimentOption[];
  readyAssetCount: number;
  stylePreset: string;
};

export function ContentJobDetailOverviewView({
  detail,
  experimentOptions,
  readyAssetCount,
  stylePreset,
}: ContentJobDetailOverviewViewProps) {
  return (
    <div className="space-y-6">
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
              {readyAssetCount}/{detail?.assets.length ?? 0}
            </p>
          </div>
          <div className="rounded-lg border p-4 text-sm">
            <p className="text-xs text-muted-foreground">스타일 프리셋</p>
            <p className="mt-1 font-medium">{stylePreset || '-'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>실험·지표 힌트</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {experimentOptions.map((item) => (
            <div key={item.title} className="rounded-lg border p-4 text-sm">
              <p className="text-xs text-muted-foreground">{item.title}</p>
              <p className="mt-1 font-medium">{item.value}</p>
              <p className="mt-2 text-xs text-muted-foreground">{item.note}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
