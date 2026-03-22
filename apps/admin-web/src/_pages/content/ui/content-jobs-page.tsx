'use client';

import { Button } from '@packages/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Suspense, useMemo } from 'react';

import { useAdminContents, useDeleteContent } from '@/entities/admin-content';
import { useAdminJobs } from '@/entities/admin-job';
import { ContentChannelSubnav } from '@/widgets/content-channel';
import { ContentJobsTable } from '@/widgets/content-operations';
import { AdminPageBack } from '@/shared/ui/admin-page-back';
import { AdminPageHeader } from '@/shared/ui/admin-page-header';

function ContentJobsPageBody() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const contentId = typeof params.contentId === 'string' ? params.contentId : '';
  const jobsQuery = useAdminJobs({ contentId, limit: 100 });
  const contentsQuery = useAdminContents({ limit: 100 });
  const deleteContent = useDeleteContent({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['adminContents'] });
      await queryClient.invalidateQueries({ queryKey: ['adminJobs'] });
      router.push('/content');
    },
  });
  const label = useMemo(() => {
    return contentsQuery.data?.items.find((c) => c.contentId === contentId)?.label;
  }, [contentsQuery.data?.items, contentId]);

  const channelLabelById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of contentsQuery.data?.items ?? []) {
      m[c.contentId] = c.label;
    }
    return m;
  }, [contentsQuery.data?.items]);

  const sortedJobs = useMemo(() => {
    const items = jobsQuery.data?.items ?? [];
    return [...items].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [jobsQuery.data?.items]);

  const handleDeleteContent = () => {
    if (!contentId.trim()) {
      return;
    }
    const ok = window.confirm(
      '이 채널을 삭제할까요? 채널에 연결된 제작 아이템과 운영 데이터도 함께 정리될 수 있습니다.',
    );
    if (!ok) {
      return;
    }
    deleteContent.mutate({ contentId });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <AdminPageHeader
          backHref="/content"
          eyebrow={
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/content" className="hover:text-foreground">
                채널
              </Link>
              <span className="text-muted-foreground/70">/</span>
              <span className="text-foreground">{(label ?? contentId) || '—'}</span>
            </div>
          }
          title={
            label
              ? `「${label}」의 제작 아이템`
              : contentId
                ? '이 채널의 제작 아이템'
                : '제작 아이템'
          }
          subtitle="이 채널에만 속한 작업함입니다. 미연결·전역 목록은 「전체 제작 아이템」에서 다룹니다. 아이디어·후보·저장은 「소재 찾기」를 사용하세요."
          actions={
            <Button
              type="button"
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={deleteContent.isPending || !contentId}
              onClick={handleDeleteContent}
            >
              {deleteContent.isPending ? '채널 삭제 중…' : '채널 삭제'}
            </Button>
          }
        />
      </div>

      <ContentChannelSubnav contentId={contentId} />

      <ContentJobsTable
        jobs={sortedJobs}
        isLoading={jobsQuery.isLoading}
        contentId={contentId}
        channelLabelById={channelLabelById}
      />
    </div>
  );
}

export function ContentJobsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8">
          <div className="space-y-3">
            <AdminPageBack href="/content" label="채널 목록으로" />
            <AdminPageHeader title="채널 상세" subtitle="불러오는 중…" />
          </div>
        </div>
      }
    >
      <ContentJobsPageBody />
    </Suspense>
  );
}
