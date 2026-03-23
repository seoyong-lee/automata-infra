'use client';

import { ADMIN_UNASSIGNED_CONTENT_ID } from '@packages/graphql';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpRight } from 'lucide-react';

import {
  getJobActionNeededLabel,
  getJobPhaseLabelKo,
  getJobStatusLabelKo,
  type AdminJob,
} from '@/entities/admin-job';
import { DataTableColumnHeader } from '@/shared/ui/data-table-column-header';

const PIPELINE_STATUS_ORDER: AdminJob['status'][] = [
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

function pipelineSortIndex(status: AdminJob['status']): number {
  const i = PIPELINE_STATUS_ORDER.indexOf(status);
  return i === -1 ? PIPELINE_STATUS_ORDER.length : i;
}

export type ContentJobsColumnsOptions = {
  /** contentId → 채널 표시 이름(카탈로그와 동기). 없으면 ID만 표시. */
  channelLabelById?: Record<string, string>;
  /** 채널 전용 작업함이면 “담당 채널” 열을 숨긴다. */
  hideChannelColumn?: boolean;
};

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

export function createContentJobsColumns(
  options?: ContentJobsColumnsOptions,
): ColumnDef<AdminJob>[] {
  const channelLabelById = options?.channelLabelById ?? {};
  const hideChannelColumn = options?.hideChannelColumn ?? false;

  const channelColumn: ColumnDef<AdminJob> = {
    accessorKey: 'contentId',
    header: ({ column }) => <DataTableColumnHeader column={column} title="채널" />,
    cell: ({ row }) => {
      const id = row.original.contentId;
      if (!id || id === ADMIN_UNASSIGNED_CONTENT_ID) {
        return (
          <span className="inline-flex rounded-md bg-admin-surface-section px-2.5 py-1 text-xs font-medium text-admin-text-muted">
            미연결
          </span>
        );
      }
      const label = channelLabelById[id];
      const href = `/content/${encodeURIComponent(id)}/jobs`;
      return (
        <div className="flex min-w-0 max-w-[min(20rem,40vw)] flex-col gap-1">
          {label ? (
            <Link
              href={href}
              className="truncate font-medium text-admin-text-strong hover:text-admin-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {label}
            </Link>
          ) : (
            <Link
              href={href}
              className="truncate font-mono text-xs text-admin-text-muted hover:text-admin-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {id.slice(0, 10)}…
            </Link>
          )}
          <span className="truncate font-mono text-[11px] text-admin-text-muted">{id}</span>
        </div>
      );
    },
  };

  const base: ColumnDef<AdminJob>[] = [
    {
      accessorKey: 'jobId',
      header: ({ column }) => <DataTableColumnHeader column={column} title="아이템 ID" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-admin-text-muted">#{row.original.jobId}</span>
      ),
    },
    {
      accessorKey: 'videoTitle',
      header: ({ column }) => <DataTableColumnHeader column={column} title="제목" />,
      cell: ({ row }) => {
        const job = row.original;
        return (
          <div className="max-w-[min(28rem,50vw)] space-y-1">
            <p className="line-clamp-2 font-semibold text-admin-text-strong">{job.videoTitle}</p>
            <p className="text-[11px] text-admin-text-muted">
              {formatDurationLabel(job.targetDurationSec)}
            </p>
          </div>
        );
      },
      filterFn: 'includesString',
    },
    {
      id: 'phase',
      accessorFn: (row) => row.status,
      header: ({ column }) => <DataTableColumnHeader column={column} title="진행" />,
      cell: ({ row }) => (
        <div className="space-y-1">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getPhaseTone(
              row.original.status,
            )}`}
          >
            {getJobPhaseLabelKo(row.original.status)}
          </span>
          <p className="text-[11px] text-admin-text-muted">
            {getJobActionNeededLabel(row.original)}
          </p>
        </div>
      ),
      sortingFn: (rowA, rowB, columnId) => {
        const a = rowA.getValue(columnId) as AdminJob['status'];
        const b = rowB.getValue(columnId) as AdminJob['status'];
        return pipelineSortIndex(a) - pipelineSortIndex(b);
      },
    },
    {
      accessorKey: 'status',
      id: 'statusLabel',
      header: ({ column }) => <DataTableColumnHeader column={column} title="상태" />,
      cell: ({ row }) => (
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusTone(
            row.original.status,
          )}`}
        >
          {getJobStatusLabelKo(row.original.status)}
        </span>
      ),
      filterFn: 'includesString',
    },
    {
      accessorKey: 'updatedAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="최근 갱신" />,
      cell: ({ row }) => {
        const job = row.original;
        return (
          <div className="space-y-1">
            <p className="tabular-nums text-sm text-admin-text-strong">
              {formatUpdatedAt(job.updatedAt)}
            </p>
            <p className="text-[11px] text-admin-text-muted">
              {job.autoPublish ? '자동 공개' : '수동 공개'}
            </p>
          </div>
        );
      },
      sortingFn: (rowA, rowB, columnId) => {
        const a = new Date(String(rowA.getValue(columnId))).getTime();
        const b = new Date(String(rowB.getValue(columnId))).getTime();
        return a - b;
      },
    },
    ...(hideChannelColumn ? [] : [channelColumn]),
    {
      id: 'openDetail',
      header: () => <span className="text-admin-text-muted">작업</span>,
      cell: ({ row }) => (
        <Link
          href={`/jobs/${encodeURIComponent(row.original.jobId)}/overview`}
          className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-admin-primary transition-colors hover:bg-admin-surface-section"
          onClick={(e) => e.stopPropagation()}
        >
          열기
          <ArrowUpRight className="size-3.5" />
        </Link>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];

  return base;
}
