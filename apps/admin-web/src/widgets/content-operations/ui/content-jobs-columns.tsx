'use client';

import { ADMIN_UNASSIGNED_CONTENT_ID } from '@packages/graphql';
import { Badge } from '@packages/ui/badge';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';

import type { AdminJob } from '@/entities/admin-job';
import { DataTableColumnHeader } from '@/shared/ui/data-table-column-header';

export type ContentJobsColumnsOptions = {
  /** contentId → 채널 표시 이름(카탈로그와 동기). 없으면 ID만 표시. */
  channelLabelById?: Record<string, string>;
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
  return [
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="상태" />,
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-normal">
          {row.original.status}
        </Badge>
      ),
      filterFn: 'includesString',
    },
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
      accessorKey: 'contentId',
      header: ({ column }) => <DataTableColumnHeader column={column} title="연결 채널" />,
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
                {id}
              </Link>
            )}
            {label ? (
              <span className="truncate font-mono text-[11px] text-muted-foreground" title={id}>
                {id}
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      accessorKey: 'contentType',
      header: ({ column }) => <DataTableColumnHeader column={column} title="채널 유형" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.contentType ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'jobId',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Job ID" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.jobId}</span>
      ),
    },
    {
      accessorKey: 'targetDurationSec',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="길이" className="justify-end" />
      ),
      cell: ({ row }) => (
        <div className="text-right tabular-nums">{row.original.targetDurationSec}s</div>
      ),
    },
    {
      accessorKey: 'updatedAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="수정일" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatUpdatedAt(row.original.updatedAt)}</span>
      ),
      sortingFn: (rowA, rowB, columnId) => {
        const a = new Date(String(rowA.getValue(columnId))).getTime();
        const b = new Date(String(rowB.getValue(columnId))).getTime();
        return a - b;
      },
    },
  ];
}
