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
    <div className="min-w-0 space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="secondary"
          className="bg-admin-surface-card font-mono text-xs font-normal text-admin-primary"
        >
          {status}
        </Badge>
        <span className="text-sm text-admin-text-muted">현재 단계</span>
        <span className="text-sm font-medium text-admin-text-strong">
          {resolution.pipelineStageLabel}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-admin-outline-ghost bg-admin-surface-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-admin-primary">
            Target
          </p>
          <p className="mt-2 text-lg font-semibold text-admin-text-strong">{targetDuration}</p>
          <p className="mt-1 text-xs text-admin-text-muted">목표 길이</p>
        </div>
        <div className="rounded-xl border border-admin-outline-ghost bg-admin-surface-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-admin-primary">
            Channel
          </p>
          <p className="mt-2 text-lg font-semibold text-admin-text-strong">
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
          <p className="mt-1 text-xs text-admin-text-muted">현재 연결된 운영 채널</p>
        </div>
        <div className="rounded-xl border border-admin-outline-ghost bg-admin-surface-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-admin-primary">
            Source
          </p>
          <p className="mt-2 text-lg font-semibold text-admin-text-strong">
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
          <p className="mt-1 text-xs text-admin-text-muted">소재/시드 연결 상태</p>
        </div>
        <div className="rounded-xl border border-admin-outline-ghost bg-admin-surface-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-admin-primary">
            Updated
          </p>
          <p className="mt-2 text-lg font-semibold tabular-nums text-admin-text-strong">
            {updatedAt}
          </p>
          <p className="mt-1 text-xs text-admin-text-muted">마지막 갱신 시각</p>
        </div>
      </div>
      {resolution.note ? (
        <div className="rounded-xl border border-admin-outline-ghost bg-admin-surface-card p-4 text-sm leading-6 text-admin-text-muted">
          {resolution.note}
        </div>
      ) : null}
    </div>
  );
}
