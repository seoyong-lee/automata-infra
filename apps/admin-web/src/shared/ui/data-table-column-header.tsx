'use client';

import { Button } from '@packages/ui/button';
import { cn } from '@packages/ui';
import type { Column } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';

/** storytalk-web `DataTableColumnHeader`와 동일한 시각; 정렬은 버튼 클릭으로 오름차순 → 내림차순 → 해제 순환. */
export type DataTableColumnHeaderProps<TData, TValue> = {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
};

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 data-[state=open]:bg-accent"
        onClick={() => {
          const sorted = column.getIsSorted();
          if (sorted === 'asc') {
            column.toggleSorting(true);
          } else if (sorted === 'desc') {
            column.clearSorting();
          } else {
            column.toggleSorting(false);
          }
        }}
      >
        <span>{title}</span>
        {column.getIsSorted() === 'desc' ? (
          <ArrowDown className="ml-2 size-4" />
        ) : column.getIsSorted() === 'asc' ? (
          <ArrowUp className="ml-2 size-4" />
        ) : (
          <ChevronsUpDown className="ml-2 size-4" />
        )}
      </Button>
    </div>
  );
}
