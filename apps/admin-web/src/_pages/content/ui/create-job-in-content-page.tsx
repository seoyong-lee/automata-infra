'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Suspense, useMemo } from 'react';

import { useAdminContents } from '@/entities/admin-content';
import { ContentJobCreateFormCard } from '@/features/content-job-create';
import { AdminPageBack } from '@/shared/ui/admin-page-back';
import { AdminPageHeader } from '@/shared/ui/admin-page-header';

function CreateJobInContentContent() {
  const router = useRouter();
  const params = useParams();
  const contentId = typeof params.contentId === 'string' ? params.contentId : '';
  const contentsQuery = useAdminContents({ limit: 100 });
  const content = useMemo(
    () => contentsQuery.data?.items.find((c) => c.contentId === contentId),
    [contentsQuery.data?.items, contentId],
  );

  const jobsListHref = `/content/${encodeURIComponent(contentId)}/jobs`;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <AdminPageBack href={jobsListHref} label="이 채널의 제작 아이템 목록으로" />
        <AdminPageHeader
          eyebrow={
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/content" className="hover:text-foreground">
                채널
              </Link>
              <span className="text-muted-foreground/70">/</span>
              <Link href={jobsListHref} className="hover:text-foreground">
                {content?.label ?? contentId}
              </Link>
              <span className="text-muted-foreground/70">/</span>
              <span className="text-foreground">새 제작 아이템</span>
            </div>
          }
          title="제작 아이템 만들기"
          subtitle="한 번에 제작 아이템을 만들고 토픽 플랜까지 완료합니다. 이후 스크립트·에셋·업로드로 이어갑니다."
        />
      </div>

      <ContentJobCreateFormCard
        fixedContent={{
          contentId,
          label: content?.label,
          isResolved: contentsQuery.isLoading || Boolean(content),
        }}
        onCancel={() => router.push(jobsListHref)}
        onCreated={(jobId) => router.push(`/jobs/${jobId}/overview`)}
      />
    </div>
  );
}

export function CreateJobInContentPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="space-y-3">
            <AdminPageBack href="/content" label="채널 목록으로" />
            <AdminPageHeader title="제작 아이템 만들기" subtitle="불러오는 중…" />
          </div>
        </div>
      }
    >
      <CreateJobInContentContent />
    </Suspense>
  );
}
