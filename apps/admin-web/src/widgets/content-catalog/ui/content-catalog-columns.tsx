'use client';

import type { ColumnDef } from '@tanstack/react-table';

import type { AdminContent } from '@/entities/admin-content';
import { DataTableColumnHeader } from '@/shared/ui/data-table-column-header';

function formatDateTime(iso: string) {
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

export function createContentCatalogColumns(options: {
  onDelete: (contentId: string) => void;
  deletingId?: string;
}): ColumnDef<AdminContent>[] {
  const dateSortFn: ColumnDef<AdminContent>['sortingFn'] = (rowA, rowB, columnId) => {
    const a = new Date(String(rowA.getValue(columnId))).getTime();
    const b = new Date(String(rowB.getValue(columnId))).getTime();
    return a - b;
  };

  return [
    {
      accessorKey: 'label',
      header: ({ column }) => <DataTableColumnHeader column={column} title="이름" />,
      cell: ({ row }) => <span className="font-medium">{row.original.label}</span>,
      filterFn: 'includesString',
    },
    {
      accessorKey: 'contentId',
      header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.contentId}</span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="생성일" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums">
          {formatDateTime(row.original.createdAt)}
        </span>
      ),
      sortingFn: dateSortFn,
    },
    {
      accessorKey: 'updatedAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="수정일" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums">
          {formatDateTime(row.original.updatedAt)}
        </span>
      ),
      sortingFn: dateSortFn,
    },
  ];
}
