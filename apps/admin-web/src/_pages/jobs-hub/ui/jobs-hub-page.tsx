'use client';

import { cn } from '@packages/ui';
import { Button } from '@packages/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import { ADMIN_UNASSIGNED_CONTENT_ID } from '@packages/graphql';
import { getErrorMessage } from '@packages/utils';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Suspense, useMemo, useState } from 'react';

import { useAdminContents } from '@/entities/admin-content';
import { useAdminJobs, useAttachJobToContent } from '@/entities/admin-job';
import { ContentJobsTable } from '@/widgets/content-operations';
import { AdminPageHeader } from '@/shared/ui/admin-page-header';

function JobsHubPageBody() {
  const queryClient = useQueryClient();
  const jobsQuery = useAdminJobs({
    contentId: ADMIN_UNASSIGNED_CONTENT_ID,
    limit: 100,
  });
  const contentsQuery = useAdminContents({ limit: 200 });

  const [linkJobId, setLinkJobId] = useState<string | null>(null);
  const [pickContentId, setPickContentId] = useState('');

  const attach = useAttachJobToContent({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['adminJobs'] });
      setLinkJobId(null);
      setPickContentId('');
    },
  });

  const sortedJobs = useMemo(() => {
    const items = jobsQuery.data?.items ?? [];
    return [...items].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [jobsQuery.data?.items]);

  const contentOptions = contentsQuery.data?.items ?? [];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="제작 아이템"
        subtitle="채널(콘텐츠)에 아직 연결하지 않은 한 편 단위 작업입니다. 준비되면 채널에 연결하거나, 채널 상세에서 바로 만들 수도 있습니다."
      />

      {linkJobId ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">콘텐츠에 연결</CardTitle>
            <CardDescription>
              잡 <span className="font-mono text-xs">{linkJobId}</span>을(를) 유튜브에 맞춘
              콘텐츠(채널)에 붙입니다. 시드·브리프·토픽 플랜의 contentId도 함께 갱신됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <label className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
              <span className="font-medium">콘텐츠</span>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={pickContentId}
                onChange={(e) => setPickContentId(e.target.value)}
              >
                <option value="">선택…</option>
                {contentOptions.map((c) => (
                  <option key={c.contentId} value={c.contentId}>
                    {c.label} ({c.contentId})
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={
                  attach.isPending ||
                  !pickContentId ||
                  pickContentId === ADMIN_UNASSIGNED_CONTENT_ID
                }
                onClick={() => {
                  if (!linkJobId || !pickContentId) return;
                  attach.mutate({ jobId: linkJobId, contentId: pickContentId });
                }}
              >
                {attach.isPending ? '연결 중…' : '연결'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setLinkJobId(null);
                  setPickContentId('');
                }}
              >
                취소
              </Button>
            </div>
          </CardContent>
          {attach.error ? (
            <p className="px-6 pb-6 text-sm text-destructive">{getErrorMessage(attach.error)}</p>
          ) : null}
        </Card>
      ) : null}

      <ContentJobsTable
        jobs={sortedJobs}
        isLoading={jobsQuery.isLoading}
        newJobHrefOverride="/jobs/new"
        renderJobAction={(job) => (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setLinkJobId(job.jobId)}
          >
            콘텐츠에 연결
          </Button>
        )}
      />

      <p className="text-sm text-muted-foreground">
        <Link href="/content" className="text-foreground underline underline-offset-4">
          콘텐츠 관리
        </Link>
        에서 채널을 등록한 뒤, 여기서 잡을 연결하거나 콘텐츠별 잡 목록에서 작업할 수 있습니다.
      </p>
    </div>
  );
}

export function JobsHubPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8">
          <AdminPageHeader title="잡" subtitle="불러오는 중…" />
        </div>
      }
    >
      <JobsHubPageBody />
    </Suspense>
  );
}
