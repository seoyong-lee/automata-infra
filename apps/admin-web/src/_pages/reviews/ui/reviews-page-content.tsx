'use client';

import { Badge } from '@packages/ui/badge';
import { Button } from '@packages/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import { getErrorMessage } from '@packages/utils';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo } from 'react';

import {
  useAdminJobs,
  usePendingReviews,
  useRequestJobUpload,
  useSubmitReviewDecision,
} from '@/entities/admin-job';
import { AdminPageHeader } from '@/shared/ui/admin-page-header';

import { WorkStatusJobsTable } from './work-status-jobs-table';
import { WorkStatusUnifiedOverview } from './work-status-unified-overview';

const linkOutlineBtnSm =
  'inline-flex h-8 items-center justify-center rounded-md border border-border bg-transparent px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground';

export function ReviewsPageContent() {
  const queryClient = useQueryClient();
  const jobsQuery = useAdminJobs({ limit: 500 });
  const pending = usePendingReviews({ limit: 20 });
  const submitReview = useSubmitReviewDecision({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pendingReviews'] });
      await queryClient.invalidateQueries({ queryKey: ['adminJobs'] });
    },
  });
  const requestUpload = useRequestJobUpload({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pendingReviews'] });
      await queryClient.invalidateQueries({ queryKey: ['adminJobs'] });
    },
  });

  const sortedJobs = useMemo(() => {
    const items = jobsQuery.data?.items ?? [];
    return [...items].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
  }, [jobsQuery.data?.items]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="검수함"
        subtitle="검수 대기·실패 조치가 필요한 제작 아이템을 모읍니다. 행에서 제작 상세(렌더·업로드 탭)로 바로 이동할 수 있습니다."
      />

      <WorkStatusUnifiedOverview />

      <Card>
        <CardHeader>
          <CardTitle>검수 대기</CardTitle>
          <CardDescription>할당된 검수 건에 대한 승인·재생성·업로드 액션입니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pending.isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
          {pending.error ? (
            <p className="text-sm text-destructive">{getErrorMessage(pending.error)}</p>
          ) : null}
          {(pending.data?.items ?? []).map((item) => (
            <div key={item.jobId} className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center gap-3">
                <strong className="font-mono text-xs">{item.jobId}</strong>
                <Badge variant="outline">{item.status}</Badge>
                <Badge variant="secondary">Preview ready</Badge>
                <Link
                  href={`/jobs/${item.jobId}/publish`}
                  className={`${linkOutlineBtnSm} ml-auto shrink-0`}
                >
                  제작 상세
                </Link>
              </div>
              <div className="grid gap-3 text-sm md:grid-cols-2">
                <div className="rounded-md bg-muted/50 p-3">
                  <p className="font-medium">Warnings</p>
                  <p className="mt-1 text-muted-foreground">
                    scene 3 visual check, CTA tone review, subtitle timing review
                  </p>
                </div>
                <div className="rounded-md bg-muted/50 p-3">
                  <p className="font-medium">Quick Summary</p>
                  <p className="mt-1 text-muted-foreground">
                    preview compare, scene timeline, subtitle overlay toggle
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => submitReview.mutate({ jobId: item.jobId, action: 'APPROVE' })}
                >
                  Approve
                </Button>
                <Button size="sm" variant="secondary">
                  Regenerate Scene 3
                </Button>
                <Button size="sm" variant="secondary">
                  Regenerate TTS
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => submitReview.mutate({ jobId: item.jobId, action: 'REJECT' })}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={requestUpload.isPending}
                  onClick={() => requestUpload.mutate({ jobId: item.jobId })}
                >
                  {requestUpload.isPending ? 'Uploading...' : 'Upload to YouTube'}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>제작 아이템 목록</CardTitle>
          <CardDescription>
            행 전체를 선택하면 해당 채널 상세(제작 탭)로 이동합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobsQuery.error ? (
            <p className="text-sm text-destructive">{getErrorMessage(jobsQuery.error)}</p>
          ) : null}
          <WorkStatusJobsTable jobs={sortedJobs} isLoading={jobsQuery.isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
