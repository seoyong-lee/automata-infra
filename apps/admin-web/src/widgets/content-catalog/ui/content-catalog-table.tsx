'use client';

import type { AdminContent } from '@/entities/admin-content';
import { AdminDataTable, type AdminDataTableColumnClassName } from '@/shared/ui/admin-data-table';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { KeyboardEvent, ReactNode } from 'react';
import { useMemo } from 'react';

import { createContentCatalogColumns } from './content-catalog-columns';

type Props = {
  items: AdminContent[];
  isLoading: boolean;
  onDelete: (contentId: string) => void;
  deletingId: string | undefined;
  toolbarEnd?: ReactNode | null;
};

function getCatalogColumnClassName(columnId: string): AdminDataTableColumnClassName {
  if (columnId === 'createdAt') {
    return { header: 'hidden sm:table-cell', cell: 'hidden sm:table-cell' };
  }
  if (columnId === 'updatedAt') {
    return { header: 'hidden lg:table-cell', cell: 'hidden lg:table-cell' };
  }
  if (columnId === 'contentId') {
    return { header: 'hidden md:table-cell', cell: 'hidden md:table-cell' };
  }
  if (columnId === 'actions') {
    return { header: 'w-[100px] text-right', cell: 'text-right' };
  }
  return {};
}

export function ContentCatalogTable({ items, isLoading, onDelete, deletingId, toolbarEnd }: Props) {
  const router = useRouter();

  const columns = useMemo(
    () => createContentCatalogColumns({ onDelete, deletingId }),
    [onDelete, deletingId],
  );

  const goToDetail = (contentId: string) => {
    router.push(`/content/${encodeURIComponent(contentId)}/jobs`);
  };

  const onRowKeyDown = (e: KeyboardEvent<HTMLTableRowElement>, contentId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goToDetail(contentId);
    }
  };

  return (
    <div className="space-y-4">
      {isLoading ? <p className="text-sm text-muted-foreground">불러오는 중…</p> : null}
      {!isLoading && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">등록된 채널이 없습니다.</p>
      ) : null}
      {!isLoading && items.length > 0 ? (
        <AdminDataTable<AdminContent>
          data={items}
          columns={columns}
          getRowId={(row) => row.contentId}
          initialSorting={[{ id: 'updatedAt', desc: true }]}
          filterColumnId="label"
          filterPlaceholder="이름 검색…"
          toolbarEnd={
            toolbarEnd === undefined ? (
              <Link
                href="/content/new"
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-md bg-linear-to-br from-admin-primary to-admin-primary-container px-5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition-all hover:opacity-95"
              >
                채널 추가
              </Link>
            ) : (
              toolbarEnd
            )
          }
          getColumnClassName={getCatalogColumnClassName}
          rowProps={(row) => ({
            role: 'link',
            tabIndex: 0,
            className: 'cursor-pointer',
            onClick: () => goToDetail(row.original.contentId),
            onKeyDown: (e) => onRowKeyDown(e, row.original.contentId),
          })}
        />
      ) : null}
    </div>
  );
}
