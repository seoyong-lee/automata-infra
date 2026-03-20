'use client';

import { Button } from '@packages/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import type { ContentLineSummary, QuickFilterKey } from '../model';
import { quickFilterMeta } from '../consts';

type Props = {
  contentLineSummary: ContentLineSummary;
  quickFilterCounts: Record<QuickFilterKey, number>;
  selectedQuickFilter: QuickFilterKey;
  onSelectQuickFilter: (filter: QuickFilterKey) => void;
};

export function ContentLineOverviewSection({
  contentLineSummary,
  quickFilterCounts,
  selectedQuickFilter,
  onSelectQuickFilter,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Line Overview</CardTitle>
        <CardDescription>
          선택한 콘텐츠 라인의 운영 상태와 빠른 액션을 한곳에서 확인합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Selected line</p>
          <p className="mt-1 font-medium">{contentLineSummary.title}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Total jobs</p>
              <p className="text-sm font-medium">{contentLineSummary.totalJobs}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active variants</p>
              <p className="text-sm font-medium">{contentLineSummary.activeVariants}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Failed jobs</p>
              <p className="text-sm font-medium">{contentLineSummary.failedJobs}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Review queue</p>
              <p className="text-sm font-medium">{contentLineSummary.reviewJobs}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Uploaded</p>
              <p className="text-sm font-medium">{contentLineSummary.uploadedJobs}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg duration</p>
              <p className="text-sm font-medium">{contentLineSummary.averageDurationSec}s</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <p className="font-medium">Quick Filters</p>
          <p className="mt-1 text-sm text-muted-foreground">
            병목, 실패, 업로드 대기 등 현재 필요한 운영 큐만 빠르게 추립니다.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {quickFilterMeta.map((item) => (
              <Button
                key={item.key}
                variant={selectedQuickFilter === item.key ? 'default' : 'outline'}
                onClick={() => onSelectQuickFilter(item.key)}
              >
                {item.label} ({quickFilterCounts[item.key]})
              </Button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {quickFilterMeta.find((item) => item.key === selectedQuickFilter)?.description}
          </p>
        </div>

        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          <p>Latest upload: {contentLineSummary.latestUploadedAt ?? 'none yet'}</p>
          <p className="mt-1">
            Last activity: {contentLineSummary.latestUpdatedAt ?? 'no updates'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
