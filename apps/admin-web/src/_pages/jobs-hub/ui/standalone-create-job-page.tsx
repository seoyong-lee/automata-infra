'use client';

import { useRouter } from 'next/navigation';
import { Suspense } from 'react';

import { ContentJobCreateFormCard } from '@/features/content-job-create';
import { AdminPageBack } from '@/shared/ui/admin-page-back';
import { AdminPageHeader } from '@/shared/ui/admin-page-header';

function StandaloneCreateJobContent() {
  const router = useRouter();

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <AdminPageBack href="/jobs" label="제작 아이템 목록으로" />
        <AdminPageHeader
          title="제작 아이템 만들기"
          subtitle="제작 아이템을 만듭니다. 채널은 이후 제작 아이템 목록에서 연결할 수 있습니다."
        />
      </div>

      <ContentJobCreateFormCard
        onCancel={() => router.push('/jobs')}
        onCreated={(jobId) => router.push(`/jobs/${jobId}/overview`)}
      />
    </div>
  );
}

export function StandaloneCreateJobPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="space-y-3">
            <AdminPageBack href="/jobs" label="제작 아이템 목록으로" />
            <AdminPageHeader title="미연결 제작 아이템 만들기" subtitle="불러오는 중…" />
          </div>
        </div>
      }
    >
      <StandaloneCreateJobContent />
    </Suspense>
  );
}
