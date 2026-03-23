'use client';

import { cn } from '@packages/ui';
import { Input } from '@packages/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@packages/ui/table';
import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  type ColumnDef,
  type ColumnFiltersState,
  type Row,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

export type AdminDataTableColumnClassName = {
  header?: string;
  cell?: string;
};

export type AdminDataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  getRowId: (row: TData) => string;
  initialSorting?: SortingState;
  /** 이 컬럼 id에 문자열 필터를 바인딩하는 검색 입력 (툴바 왼쪽). */
  filterColumnId?: string;
  filterPlaceholder?: string;
  /** 툴바 오른쪽(예: 생성 버튼). 검색과 같은 줄에 배치됩니다. */
  toolbarEnd?: ReactNode;
  getColumnClassName?: (columnId: string) => AdminDataTableColumnClassName;
  tableBodyClassName?: string;
  rowProps?: (row: Row<TData>) => React.HTMLAttributes<HTMLTableRowElement>;
  emptyFilterMessage?: string;
};

export function AdminDataTable<TData>({
  data,
  columns,
  getRowId,
  initialSorting = [],
  filterColumnId,
  filterPlaceholder = '검색…',
  toolbarEnd,
  getColumnClassName,
  tableBodyClassName,
  rowProps,
  emptyFilterMessage = '검색 결과가 없습니다.',
}: AdminDataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table API
  const table = useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: { sorting, columnFilters },
  });

  const showToolbar = Boolean(filterColumnId) || toolbarEnd != null;

  return (
    <div className="space-y-4">
      {showToolbar ? (
        <div className="admin-section-shell flex flex-wrap items-center gap-3 p-4">
          {filterColumnId ? (
            <Input
              placeholder={filterPlaceholder}
              value={(table.getColumn(filterColumnId)?.getFilterValue() as string) ?? ''}
              onChange={(e) => table.getColumn(filterColumnId)?.setFilterValue(e.target.value)}
              className="h-11 max-w-md min-w-0 flex-1 border-admin-outline-ghost bg-admin-surface-card"
            />
          ) : null}
          {toolbarEnd ? <div className="ms-auto shrink-0">{toolbarEnd}</div> : null}
        </div>
      ) : null}
      <div className="admin-page-shell overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="bg-admin-surface-section/70 hover:bg-admin-surface-section/70"
              >
                {headerGroup.headers.map((header) => {
                  const cls = getColumnClassName?.(header.column.id) ?? {};
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        'h-12 text-[10px] font-semibold uppercase tracking-[0.22em] text-admin-text-muted',
                        cls.header,
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className={tableBodyClassName}>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const extra = rowProps?.(row) ?? {};
                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className={cn(
                      'border-admin-outline-ghost transition-colors hover:bg-admin-surface-section/45',
                      extra.className,
                    )}
                    {...extra}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const cls = getColumnClassName?.(cell.column.id) ?? {};
                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            'py-4 align-middle text-sm text-admin-text-strong',
                            cls.cell,
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {emptyFilterMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
