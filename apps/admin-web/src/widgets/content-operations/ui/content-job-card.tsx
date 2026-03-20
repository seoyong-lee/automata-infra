'use client';

import { Badge } from '@packages/ui/badge';
import { Button } from '@packages/ui/button';
import Link from 'next/link';
import type { AdminJob } from '@/entities/admin-job';

const stepLinkClass =
  'rounded-md border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-accent';

const detailLinkClass =
  'inline-flex h-8 shrink-0 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90';

const CARD_QUICK_STEPS = [
  ['ideation', '아이데이션'],
  ['script', '스크립트'],
  ['image', '이미지'],
  ['voice', '음성'],
  ['video', '영상'],
  ['review', '렌더'],
  ['upload', '업로드'],
] as const;

type Props = {
  job: AdminJob;
  isUploading: boolean;
  onUpload: (jobId: string) => void;
};

export function ContentJobCard({ job, isUploading, onUpload }: Props) {
  return (
    <div className="w-full rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{job.status}</Badge>
            {job.contentType ? <Badge variant="secondary">{job.contentType}</Badge> : null}
            {job.variant ? (
              <span className="text-xs text-muted-foreground">{job.variant}</span>
            ) : null}
          </div>
          <p className="font-medium">{job.videoTitle}</p>
          <p className="font-mono text-xs text-muted-foreground">{job.jobId}</p>
        </div>

        <div className="grid gap-3 text-right text-xs text-muted-foreground md:grid-cols-2">
          <div>
            <p className="font-medium text-foreground">Duration</p>
            <p>{job.targetDurationSec}s</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Publish</p>
            <p>{job.autoPublish ? 'auto' : 'manual'}</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Retry</p>
            <p>{job.retryCount}</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Updated</p>
            <p>{job.updatedAt}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link href={`/jobs/${job.jobId}/ideation`} className={detailLinkClass}>
          콘텐츠 상세
        </Link>
        {CARD_QUICK_STEPS.map(([step, label]) => (
          <Link key={step} className={stepLinkClass} href={`/jobs/${job.jobId}/${step}`}>
            {label}
          </Link>
        ))}
        <Button
          size="sm"
          variant="outline"
          disabled={isUploading}
          onClick={() => onUpload(job.jobId)}
        >
          {isUploading ? '업로드 중...' : '업로드'}
        </Button>
      </div>
    </div>
  );
}
