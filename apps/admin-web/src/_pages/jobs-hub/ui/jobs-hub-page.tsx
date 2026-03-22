'use client';

import { Button } from '@packages/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import { ADMIN_UNASSIGNED_CONTENT_ID } from '@packages/graphql';
import { getErrorMessage } from '@packages/utils';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Suspense, useMemo, useState } from 'react';

import { useAdminContents } from '@/entities/admin-content';
import { useAdminJobs, useAttachJobToContent } from '@/entities/admin-job';
import { CreateSourceItemDialog } from '@/widgets/create-source-item';
import { ContentJobsTable } from '@/widgets/content-operations';
import { AdminPageHeader } from '@/shared/ui/admin-page-header';

function JobsHubPageBody() {
  const queryClient = useQueryClient();
  const jobsQuery = useAdminJobs({
    limit: 200,
  });
  const contentsQuery = useAdminContents({ limit: 200 });

  const [linkJobId, setLinkJobId] = useState<string | null>(null);
  const [pickContentId, setPickContentId] = useState('');
  const [createSourceOpen, setCreateSourceOpen] = useState(false);

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

  const channelLabelById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of contentOptions) {
      m[c.contentId] = c.label;
    }
    return m;
  }, [contentOptions]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="제작 아이템"
        subtitle="미연결·채널에 연결된 제작 아이템을 한 목록에서 봅니다. 연결된 항목은 어떤 채널에 붙어 있는지 표시됩니다. 한 번 연결된 뒤에는 다른 채널로 옮길 수 없습니다(재연결·중복 연결 불가)."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/jobs/new"
              className="inline-flex h-8 items-center justify-center rounded-md bg-secondary px-3 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
            >
              새 제작 아이템
            </Link>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateSourceOpen(true)}
            >
              새 소재 만들기
            </Button>
          </div>
        }
      />

      <CreateSourceItemDialog
        open={createSourceOpen}
        onClose={() => setCreateSourceOpen(false)}
        channels={contentOptions}
      />

      {linkJobId ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">채널에 연결</CardTitle>
            <CardDescription>
              제작 아이템 <span className="font-mono text-xs">{linkJobId}</span>을(를) 유튜브에 맞춘
              채널에 붙입니다. 시드·브리프·토픽 플랜의 contentId도 함께 갱신됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <label className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
              <span className="font-medium">채널</span>
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
        channelLabelById={channelLabelById}
        renderJobAction={(job) =>
          !job.contentId || job.contentId === ADMIN_UNASSIGNED_CONTENT_ID ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setLinkJobId(job.jobId)}
            >
              채널에 연결
            </Button>
          ) : null
        }
      />

      <p className="text-sm text-muted-foreground">
        <Link href="/content" className="text-foreground underline underline-offset-4">
          채널
        </Link>
        을 등록한 뒤 미연결 항목에 붙이거나,{' '}
        <Link href="/content" className="text-foreground underline underline-offset-4">
          채널 상세
        </Link>
        의 제작 아이템 목록에서 채널별로 작업할 수도 있습니다.
      </p>
    </div>
  );
}

export function JobsHubPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8">
          <AdminPageHeader title="제작 아이템" subtitle="불러오는 중…" />
        </div>
      }
    >
      <JobsHubPageBody />
    </Suspense>
  );
}
