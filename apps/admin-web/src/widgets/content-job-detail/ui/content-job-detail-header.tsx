'use client';

import { Button } from '@packages/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';
import Link from 'next/link';

import { JobDraftDetail } from '../model';

type ContentJobDetailHeaderProps = {
  contentLineHref: string;
  detail?: JobDraftDetail;
  jobId: string;
  newJobHref: string;
  sceneCount: number;
};

const getContentType = (detail?: JobDraftDetail) => {
  return detail?.contentBrief?.contentType ?? detail?.job.contentType;
};

const buildMetricCards = (
  detail: JobDraftDetail | undefined,
  jobId: string,
  sceneCount: number,
) => {
  return [
    { label: 'Job ID', value: jobId, valueClassName: 'font-mono text-xs' },
    { label: 'Status', value: detail?.job.status ?? '-' },
    { label: 'Content Type', value: getContentType(detail) ?? '-' },
    { label: 'Channel', value: detail?.job.channelId ?? '-' },
    { label: 'Scene Count', value: String(sceneCount) },
    { label: 'Est. Cost', value: `$${((sceneCount || 5) * 0.06).toFixed(2)}` },
  ];
};

export function ContentJobDetailHeader({
  contentLineHref,
  detail,
  jobId,
  newJobHref,
  sceneCount,
}: ContentJobDetailHeaderProps) {
  const contentType = getContentType(detail);
  const metricCards = buildMetricCards(detail, jobId, sceneCount);

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link href="/jobs" className="hover:text-primary">
            콘텐츠 관리
          </Link>
          <span>/</span>
          <Link href={contentLineHref} className="hover:text-primary">
            {detail?.job.channelId ?? 'channel'}
          </Link>
          <span>/</span>
          <span>{contentType ?? 'job'}</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Content Job Deep Workspace</CardTitle>
            <p className="text-sm text-muted-foreground">
              선택된 채널과 콘텐츠 라인 안에서 특정 잡을 심화 편집하는 화면입니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="text-sm text-primary hover:underline" href={contentLineHref}>
              Back to Content Line
            </Link>
            <Button
              variant="outline"
              onClick={() => {
                window.location.href = newJobHref;
              }}
              disabled={!detail?.job.channelId}
            >
              New Job in Line
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-4">
        {metricCards.map((item) => (
          <div key={item.label} className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className={`mt-1 text-sm font-medium ${item.valueClassName ?? ''}`}>{item.value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
