'use client';

import { ADMIN_UNASSIGNED_CONTENT_ID } from '@packages/graphql';
import { Badge } from '@packages/ui/badge';
import Link from 'next/link';

import { formatJobTimestamp } from '../../lib/format-job-timestamp';
import type { JobWorkActionResolution } from '../../lib/resolve-job-work-action';
import type { JobDraftDetail } from '../../model';

type Props = {
  detail?: JobDraftDetail;
  resolution: JobWorkActionResolution;
};

// eslint-disable-next-line complexity -- 연결 소재·채널 분기
export function ContentJobDetailWorkHeaderMeta({ detail, resolution }: Props) {
  const job = detail?.job;
  const status = job?.status ?? '—';
  const updatedAt = job?.updatedAt ? formatJobTimestamp(job.updatedAt) : '—';
  const contentId = job?.contentId;
  const sourceItemId = job?.sourceItemId;
  const channelOk =
    Boolean(contentId) && contentId !== ADMIN_UNASSIGNED_CONTENT_ID && Boolean(contentId?.trim());
  const discoveryHref = channelOk
    ? `/discovery?tab=saved&channel=${encodeURIComponent(contentId!)}`
    : '/discovery?tab=saved';

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="font-mono text-xs font-normal">
          {status}
        </Badge>
        <span className="text-sm text-muted-foreground">현재 단계</span>
        <span className="text-sm font-medium text-foreground">{resolution.pipelineStageLabel}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        마지막 갱신 <span className="tabular-nums text-foreground">{updatedAt}</span>
      </p>
      <p className="text-xs text-muted-foreground">
        연결 소재{' '}
        {sourceItemId ? (
          <Link href={discoveryHref} className="font-medium text-primary hover:underline">
            {sourceItemId}
          </Link>
        ) : (
          <span className="text-amber-700 dark:text-amber-400">미연결 · 소재 찾기에서 연결</span>
        )}
      </p>
      {resolution.note ? (
        <p className="text-sm leading-snug text-muted-foreground">{resolution.note}</p>
      ) : null}
    </div>
  );
}
