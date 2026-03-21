'use client';

import { cn } from '@packages/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Suspense } from 'react';

import { useAdminContents, useDeleteContent } from '@/entities/admin-content';
import { ContentCatalogTable } from '@/widgets/content-catalog';
import { AdminPageHeader } from '@/shared/ui/admin-page-header';

function ContentCatalogPageBody() {
  const queryClient = useQueryClient();
  const list = useAdminContents({ limit: 100 });
  const del = useDeleteContent({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['adminContents'] });
      await queryClient.invalidateQueries({ queryKey: ['adminJobs'] });
    },
  });

  const deletingId =
    del.isPending && del.variables?.contentId ? del.variables.contentId : undefined;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="채널"
        subtitle="운영 라인(채널) 카탈로그입니다. 채널에 붙지 않은 제작 아이템은 제작 아이템 메뉴에서 다룹니다."
      />
      <ContentCatalogTable
        items={list.data?.items ?? []}
        isLoading={list.isLoading}
        onDelete={(contentId) => del.mutate({ contentId })}
        deletingId={deletingId}
      />
      {del.error ? (
        <p className="text-sm text-destructive">
          {del.error instanceof Error ? del.error.message : '삭제에 실패했습니다.'}
        </p>
      ) : null}
    </div>
  );
}

export function ContentCatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8">
          <AdminPageHeader title="채널" subtitle="불러오는 중…" />
        </div>
      }
    >
      <ContentCatalogPageBody />
    </Suspense>
  );
}
