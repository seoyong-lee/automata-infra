'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import { Suspense } from 'react';

import { AdminPageHeader } from '@/shared/ui/admin-page-header';

import { ReviewsPageContent } from './reviews-page-content';

function ReviewsPageFallback() {
  return (
    <div className="space-y-8">
      <AdminPageHeader title="작업 현황" subtitle="화면을 불러오는 중입니다." />
      <Card>
        <CardHeader>
          <CardTitle>검수 대기</CardTitle>
          <CardDescription>잠시만 기다려 주세요.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

export function ReviewsPage() {
  return (
    <Suspense fallback={<ReviewsPageFallback />}>
      <ReviewsPageContent />
    </Suspense>
  );
}
