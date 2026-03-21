'use client';

import { Badge } from '@packages/ui/badge';
import type { ColumnDef } from '@tanstack/react-table';

import type { AdminJob } from '@/entities/admin-job';
import { DataTableColumnHeader } from '@/shared/ui/data-table-column-header';

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

export function createContentJobsColumns(): ColumnDef<AdminJob>[] {
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
      accessorKey: 'contentType',
      header: ({ column }) => <DataTableColumnHeader column={column} title="콘텐츠 타입" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.contentType ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'contentId',
      header: ({ column }) => <DataTableColumnHeader column={column} title="콘텐츠 ID" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.contentId ?? '—'}
        </span>
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
    {
      accessorKey: 'jobId',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Job ID" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.jobId}</span>
      ),
    },
  ];
}
