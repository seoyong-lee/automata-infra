'use client';

import type { ColumnDef } from '@tanstack/react-table';

import type { AdminJob } from '@/entities/admin-job';
import { DataTableColumnHeader } from '@/shared/ui/data-table-column-header';
import {
  pipelineSortIndex,
  renderChannelCell,
  renderJobIdCell,
  renderOpenDetailCell,
  renderPhaseCell,
  renderStatusCell,
  renderUpdatedAtCell,
  renderVideoTitleCell,
} from './content-jobs-column-cells';

export type ContentJobsColumnsOptions = {
  /** contentId → 채널 표시 이름(카탈로그와 동기). 없으면 ID만 표시. */
  channelLabelById?: Record<string, string>;
  /** 채널 전용 작업함이면 “담당 채널” 열을 숨긴다. */
  hideChannelColumn?: boolean;
};

function createChannelColumn(channelLabelById: Record<string, string>): ColumnDef<AdminJob> {
  return {
    accessorKey: 'contentId',
    header: ({ column }) => <DataTableColumnHeader column={column} title="채널" />,
    cell: ({ row }) => renderChannelCell(row.original, channelLabelById),
  };
}

export function createContentJobsColumns(
  options?: ContentJobsColumnsOptions,
): ColumnDef<AdminJob>[] {
  const channelLabelById = options?.channelLabelById ?? {};
  const hideChannelColumn = options?.hideChannelColumn ?? false;
  const columns: ColumnDef<AdminJob>[] = [
    {
      accessorKey: 'jobId',
      header: ({ column }) => <DataTableColumnHeader column={column} title="아이템 ID" />,
      cell: ({ row }) => renderJobIdCell(row.original.jobId),
    },
    {
      accessorKey: 'videoTitle',
      header: ({ column }) => <DataTableColumnHeader column={column} title="제목" />,
      cell: ({ row }) => renderVideoTitleCell(row.original),
      filterFn: 'includesString',
    },
    {
      id: 'phase',
      accessorFn: (row) => row.status,
      header: ({ column }) => <DataTableColumnHeader column={column} title="진행" />,
      cell: ({ row }) => renderPhaseCell(row.original),
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
      cell: ({ row }) => renderStatusCell(row.original.status),
      filterFn: 'includesString',
    },
    {
      accessorKey: 'updatedAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="최근 갱신" />,
      cell: ({ row }) => renderUpdatedAtCell(row.original),
      sortingFn: (rowA, rowB, columnId) => {
        const a = new Date(String(rowA.getValue(columnId))).getTime();
        const b = new Date(String(rowB.getValue(columnId))).getTime();
        return a - b;
      },
    },
    ...(hideChannelColumn ? [] : [createChannelColumn(channelLabelById)]),
    {
      id: 'openDetail',
      header: () => <span className="text-admin-text-muted">작업</span>,
      cell: ({ row }) => renderOpenDetailCell(row.original.jobId),
      enableSorting: false,
      enableHiding: false,
    },
  ];

  return columns;
}
