'use client';

import { ADMIN_UNASSIGNED_CONTENT_ID } from '@packages/graphql';
import { Badge } from '@packages/ui/badge';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';

import type { AdminJob } from '@/entities/admin-job';
import { DataTableColumnHeader } from '@/shared/ui/data-table-column-header';

import {
  getJobActionNeededLabel,
  getJobPhaseLabelKo,
  getJobStatusBadgeProps,
  getJobStatusLabelKo,
} from '../lib/job-table-labels';

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

export function createContentJobsColumns(
  options?: ContentJobsColumnsOptions,
): ColumnDef<AdminJob>[] {
  const channelLabelById = options?.channelLabelById ?? {};
  const hideChannelColumn = options?.hideChannelColumn ?? false;

  const channelColumn: ColumnDef<AdminJob> = {
    accessorKey: 'contentId',
    header: ({ column }) => <DataTableColumnHeader column={column} title="담당 채널" />,
    cell: ({ row }) => {
      const id = row.original.contentId;
      if (!id || id === ADMIN_UNASSIGNED_CONTENT_ID) {
        return <span className="text-muted-foreground">미연결</span>;
      }
      const label = channelLabelById[id];
      const href = `/content/${encodeURIComponent(id)}/jobs`;
      return (
        <div className="flex min-w-0 max-w-[min(20rem,40vw)] flex-col gap-0.5">
          {label ? (
            <Link
              href={href}
              className="truncate font-medium hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {label}
            </Link>
          ) : (
            <Link
              href={href}
              className="truncate font-mono text-xs hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {id.slice(0, 10)}…
            </Link>
          )}
        </div>
      );
    },
  };

  const base: ColumnDef<AdminJob>[] = [
    {
      accessorKey: 'videoTitle',
      header: ({ column }) => <DataTableColumnHeader column={column} title="제목" />,
      cell: ({ row }) => (
        <span className="line-clamp-2 max-w-[min(28rem,50vw)] font-medium">
          {row.original.videoTitle}
        </span>
      ),
      filterFn: 'includesString',
    },
    {
      id: 'phase',
      accessorFn: (row) => row.status,
      header: ({ column }) => <DataTableColumnHeader column={column} title="단계" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{getJobPhaseLabelKo(row.original.status)}</span>
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
      cell: ({ row }) => {
        const s = row.original.status;
        const { variant, className } = getJobStatusBadgeProps(s);
        return (
          <Badge variant={variant} className={className}>
            {getJobStatusLabelKo(s)}
          </Badge>
        );
      },
      filterFn: 'includesString',
    },
    {
      id: 'actionNeeded',
      accessorFn: (row) => getJobActionNeededLabel(row),
      header: ({ column }) => <DataTableColumnHeader column={column} title="필요 액션" />,
      cell: ({ row }) => {
        const text = getJobActionNeededLabel(row.original);
        return (
          <span className={text === '—' ? 'text-muted-foreground' : 'text-foreground'}>{text}</span>
        );
      },
    },
    {
      accessorKey: 'updatedAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="최근 갱신" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatUpdatedAt(row.original.updatedAt)}</span>
      ),
      sortingFn: (rowA, rowB, columnId) => {
        const a = new Date(String(rowA.getValue(columnId))).getTime();
        const b = new Date(String(rowB.getValue(columnId))).getTime();
        return a - b;
      },
    },
    ...(hideChannelColumn ? [] : [channelColumn]),
    {
      id: 'openDetail',
      header: () => <span className="text-muted-foreground">상세</span>,
      cell: ({ row }) => (
        <Link
          href={`/jobs/${encodeURIComponent(row.original.jobId)}/overview`}
          className="text-sm font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          열기
        </Link>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];

  return base;
}
