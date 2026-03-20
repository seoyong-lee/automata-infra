'use client';

import { Badge } from '@packages/ui/badge';
import { Button } from '@packages/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/card';
import { getErrorMessage } from '@packages/utils';
import { useQueryClient } from '@tanstack/react-query';
import {
  usePendingReviews,
  useRequestJobUpload,
  useSubmitReviewDecision,
} from '@/entities/admin-job';

export function ReviewsPage() {
  const queryClient = useQueryClient();
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Queue</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          영상 전체 승인보다 scene 단위 문제를 빨리 찾고, 필요한 부분만 다시 생성하는 검수 큐입니다.
        </p>
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
  );
}
