'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import { Suspense, useMemo } from 'react';

import { ContentJobsTable } from '@/widgets/content-operations';
import { useAdminJobs } from '@/entities/admin-job';
import { AdminPageHeader } from '@/shared/ui/admin-page-header';

function ContentOperationsPageContent() {
  const jobsQuery = useAdminJobs({ limit: 100 });
  const sortedJobs = useMemo(() => {
    const items = jobsQuery.data?.items ?? [];
    return [...items].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [jobsQuery.data?.items]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="채널"
        subtitle="표에서 항목을 선택하면 채널 상세로 이동합니다. 상태·큐별 보기는 「작업 현황」을 사용합니다."
      />

      <ContentJobsTable jobs={sortedJobs} isLoading={jobsQuery.isLoading} />
    </div>
  );
}

export function ContentOperationsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8">
          <AdminPageHeader title="채널" subtitle="채널 목록을 불러오는 중입니다..." />
          <Card>
            <CardHeader>
              <CardTitle>불러오는 중</CardTitle>
              <CardDescription>잠시만 기다려 주세요.</CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        </div>
      }
    >
      <ContentOperationsPageContent />
    </Suspense>
  );
}
