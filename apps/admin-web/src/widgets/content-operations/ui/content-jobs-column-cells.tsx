'use client';

import { ADMIN_UNASSIGNED_CONTENT_ID } from '@packages/graphql';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

import {
  getJobActionNeededLabel,
  getJobPhaseLabelKo,
  getJobStatusLabelKo,
  type AdminJob,
} from '@/entities/admin-job';

export function pipelineSortIndex(status: AdminJob['status']): number {
  const order: AdminJob['status'][] = [
    'DRAFT',
    'PLANNING',
    'PLANNED',
    'SCENE_JSON_BUILDING',
    'SCENE_JSON_READY',
    'ASSET_GENERATING',
    'ASSETS_READY',
    'VALIDATING',
    'RENDER_PLAN_READY',
    'RENDERED',
    'REVIEW_PENDING',
    'APPROVED',
    'REJECTED',
    'READY_TO_SCHEDULE',
    'UPLOAD_QUEUED',
    'UPLOADED',
    'FAILED',
    'METRICS_COLLECTED',
  ];
  const index = order.indexOf(status);
  return index === -1 ? order.length : index;
}

export function renderJobIdCell(jobId: string) {
  return <span className="font-mono text-xs text-admin-text-muted">#{jobId}</span>;
}

export function renderVideoTitleCell(job: AdminJob) {
  return (
    <div className="max-w-[min(28rem,50vw)] space-y-1">
      <p className="line-clamp-2 font-semibold text-admin-text-strong">{job.videoTitle}</p>
      <p className="text-[11px] text-admin-text-muted">{formatDurationLabel(job.targetDurationSec)}</p>
    </div>
  );
}

export function renderPhaseCell(job: AdminJob) {
  return (
    <div className="space-y-1">
      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getPhaseTone(
          job.status,
        )}`}
      >
        {getJobPhaseLabelKo(job.status)}
      </span>
      <p className="text-[11px] text-admin-text-muted">{getJobActionNeededLabel(job)}</p>
    </div>
  );
}

export function renderStatusCell(status: AdminJob['status']) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusTone(
        status,
      )}`}
    >
      {getJobStatusLabelKo(status)}
    </span>
  );
}

export function renderUpdatedAtCell(job: AdminJob) {
  return (
    <div className="space-y-1">
      <p className="tabular-nums text-sm text-admin-text-strong">{formatUpdatedAt(job.updatedAt)}</p>
      <p className="text-[11px] text-admin-text-muted">{job.autoPublish ? '자동 공개' : '수동 공개'}</p>
    </div>
  );
}

export function renderChannelCell(job: AdminJob, channelLabelById: Record<string, string>) {
  const id = job.contentId;
  if (!id || id === ADMIN_UNASSIGNED_CONTENT_ID) {
    return (
      <span className="inline-flex rounded-md bg-admin-surface-section px-2.5 py-1 text-xs font-medium text-admin-text-muted">
        미연결
      </span>
    );
  }

  const href = `/content/${encodeURIComponent(id)}/jobs`;
  const label = channelLabelById[id];
  return (
    <div className="flex min-w-0 max-w-[min(20rem,40vw)] flex-col gap-1">
      <Link
        href={href}
        className={
          label
            ? 'truncate font-medium text-admin-text-strong hover:text-admin-primary hover:underline'
            : 'truncate font-mono text-xs text-admin-text-muted hover:text-admin-primary hover:underline'
        }
        onClick={(e) => e.stopPropagation()}
      >
        {label ?? `${id.slice(0, 10)}…`}
      </Link>
      <span className="truncate font-mono text-[11px] text-admin-text-muted">{id}</span>
    </div>
  );
}

export function renderOpenDetailCell(jobId: string) {
  return (
    <Link
      href={`/jobs/${encodeURIComponent(jobId)}/overview`}
      className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-admin-primary transition-colors hover:bg-admin-surface-section"
      onClick={(e) => e.stopPropagation()}
    >
      열기
      <ArrowUpRight className="size-3.5" />
    </Link>
  );
}

function formatUpdatedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatDurationLabel(seconds?: number | null): string {
  if (!seconds || Number.isNaN(seconds)) {
    return '길이 미지정';
  }
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

function getStatusTone(status: AdminJob['status']): string {
  if (status === 'FAILED' || status === 'REJECTED') {
    return 'bg-admin-status-error-surface text-admin-status-error';
  }
  if (status === 'REVIEW_PENDING') {
    return 'bg-admin-status-warning-surface text-admin-status-warning';
  }
  if (status === 'UPLOADED' || status === 'METRICS_COLLECTED' || status === 'APPROVED') {
    return 'bg-admin-status-success-surface text-admin-status-success';
  }
  return 'bg-admin-surface-section text-admin-primary';
}

function getPhaseTone(status: AdminJob['status']): string {
  if (status === 'FAILED') {
    return 'bg-admin-status-error-surface text-admin-status-error';
  }
  if (status === 'REVIEW_PENDING' || status === 'READY_TO_SCHEDULE' || status === 'UPLOAD_QUEUED') {
    return 'bg-admin-status-warning-surface text-admin-status-warning';
  }
  if (status === 'UPLOADED' || status === 'METRICS_COLLECTED' || status === 'APPROVED') {
    return 'bg-admin-status-success-surface text-admin-status-success';
  }
  return 'bg-admin-surface-section text-admin-text-muted';
}
