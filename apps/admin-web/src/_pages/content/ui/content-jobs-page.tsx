'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';

import { useAdminContents } from '@/entities/admin-content';
import { useAdminJobs } from '@/entities/admin-job';
import { ContentJobsTable } from '@/widgets/content-operations';
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
      <AdminPageHeader
        eyebrow={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/content" className="hover:text-foreground">
              콘텐츠 관리
            </Link>
            <span className="text-muted-foreground/70">/</span>
            <span className="text-foreground">{(label ?? contentId) || '—'}</span>
          </div>
        }
        title={label ? `${label} · 제작 잡` : '제작 잡'}
        subtitle="이 콘텐츠(채널) 단위에 속한 잡만 표시합니다."
      />

      <ContentJobsTable
        jobs={sortedJobs}
        isLoading={jobsQuery.isLoading}
        contentId={contentId}
        contentLabel={label}
      />
    </div>
  );
}

export function ContentJobsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8">
          <AdminPageHeader title="제작 잡" subtitle="불러오는 중…" />
        </div>
      }
    >
      <ContentJobsPageBody />
    </Suspense>
  );
}
