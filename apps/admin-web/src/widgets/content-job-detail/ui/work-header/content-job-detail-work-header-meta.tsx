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
  const channelOk =
    Boolean(contentId) && contentId !== ADMIN_UNASSIGNED_CONTENT_ID && Boolean(contentId?.trim());
  const discoveryHref = channelOk
    ? `/discovery?tab=saved&channel=${encodeURIComponent(contentId!)}`
    : '/discovery?tab=saved';
  const targetDuration = job?.targetDurationSec != null ? `${job.targetDurationSec}s` : '—';
  const sourceReady = Boolean(job?.sourceItemId?.trim());

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="secondary"
          className="bg-admin-surface-section font-mono text-xs font-normal text-admin-primary"
        >
          {status}
        </Badge>
        <span className="text-sm text-admin-text-muted">현재 단계</span>
        <span className="text-sm font-medium text-admin-text-strong">
          {resolution.pipelineStageLabel}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-admin-text-muted">
        <p>
          목표 길이 <span className="font-medium text-admin-text-strong">{targetDuration}</span>
        </p>
        <p>
          채널{' '}
          {channelOk && contentId ? (
            <Link
              href={`/content/${encodeURIComponent(contentId)}/jobs`}
              className="font-medium text-admin-primary hover:underline"
            >
              {contentId}
            </Link>
          ) : (
            <span className="text-admin-status-warning">미연결</span>
          )}
        </p>
        <p>
          소재{' '}
          {sourceReady ? (
            <Link href={discoveryHref} className="font-medium text-admin-primary hover:underline">
              연결됨
            </Link>
          ) : !channelOk ? (
            <span className="text-admin-text-muted">채널 연결 후</span>
          ) : (
            <span className="text-admin-status-warning">미연결</span>
          )}
        </p>
        <p>
          마지막 갱신 <span className="tabular-nums text-admin-text-strong">{updatedAt}</span>
        </p>
      </div>
      {resolution.note ? (
        <p className="text-sm leading-snug text-admin-text-muted">{resolution.note}</p>
      ) : null}
    </div>
  );
}
