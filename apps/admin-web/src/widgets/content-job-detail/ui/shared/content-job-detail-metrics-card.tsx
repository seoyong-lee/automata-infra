'use client';

import { Card, CardContent } from '@packages/ui/card';

import { JobDraftDetail } from '../../model';

type ContentJobDetailMetricsCardProps = {
  detail?: JobDraftDetail;
  jobId: string;
  sceneCount: number;
};

const getContentType = (detail?: JobDraftDetail) => {
  return detail?.contentBrief?.contentType ?? detail?.job.contentType;
};

export function ContentJobDetailMetricsCard({
  detail,
  jobId,
  sceneCount,
}: ContentJobDetailMetricsCardProps) {
  const contentType = getContentType(detail);
  const metricCards = [
    { label: '아이템 ID', value: jobId, valueClassName: 'font-mono text-xs' },
    { label: '현재 상태', value: detail?.job.status ?? '-' },
    { label: '채널 유형', value: contentType ?? '-' },
    { label: '채널', value: detail?.job.contentId ?? '-' },
    { label: '씬 수', value: String(sceneCount) },
    { label: '예상 비용', value: `$${((sceneCount || 5) * 0.06).toFixed(2)}` },
  ];

  return (
    <Card>
      <CardContent className="grid gap-4 pt-6 md:grid-cols-4">
        {metricCards.map((item) => (
          <div key={item.label} className="rounded-lg border border-border/80 p-4">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className={`mt-1 text-sm font-medium ${item.valueClassName ?? ''}`}>{item.value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
