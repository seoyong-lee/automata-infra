'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';

import { useAdminContents } from '@/entities/admin-content';
import { useAdminJobs } from '@/entities/admin-job';
import { ContentJobsTable } from '@/widgets/content-operations';
import { AdminPageBack } from '@/shared/ui/admin-page-back';
import { AdminPageHeader } from '@/shared/ui/admin-page-header';

function ContentJobsPageBody() {
  const params = useParams();
  const contentId = typeof params.contentId === 'string' ? params.contentId : '';
  const jobsQuery = useAdminJobs({ contentId, limit: 100 });
  const contentsQuery = useAdminContents({ limit: 100 });
  const label = useMemo(() => {
    return contentsQuery.data?.items.find((c) => c.contentId === contentId)?.label;
  }, [contentsQuery.data?.items, contentId]);

  const sortedJobs = useMemo(() => {
    const items = jobsQuery.data?.items ?? [];
    return [...items].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [jobsQuery.data?.items]);

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
          title="채널 상세"
          subtitle={
            label
              ? `행을 선택하면 제작 아이템 상세로 이동합니다.`
              : '행을 선택하면 제작 아이템 상세로 이동합니다.'
          }
        />
      </div>

      <ContentJobsTable jobs={sortedJobs} isLoading={jobsQuery.isLoading} contentId={contentId} />
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
