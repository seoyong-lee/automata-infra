'use client';

import type { AdminContent } from '@/entities/admin-content';
import { AdminDataTable, type AdminDataTableColumnClassName } from '@/shared/ui/admin-data-table';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { KeyboardEvent } from 'react';
import { useMemo } from 'react';

import { createContentCatalogColumns } from './content-catalog-columns';

type Props = {
  items: AdminContent[];
  isLoading: boolean;
  onDelete: (contentId: string) => void;
  deletingId: string | undefined;
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

export function ContentCatalogTable({ items, isLoading, onDelete, deletingId }: Props) {
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
        <p className="text-sm text-muted-foreground">등록된 콘텐츠가 없습니다.</p>
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
            <Link
              href="/content/new"
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              콘텐츠 추가
            </Link>
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
