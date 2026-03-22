'use client';

import { useChannelPublishQueueQuery, type ChannelPublishQueueItem } from '@packages/graphql';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';

import { ContentChannelSubnav } from '@/widgets/content-channel';
import { useAdminJobs } from '@/entities/admin-job';
import { AdminPageBack } from '@/shared/ui/admin-page-back';
import { AdminPageHeader } from '@/shared/ui/admin-page-header';

function titleForJob(
  jobId: string,
  jobs: { jobId: string; videoTitle: string }[] | undefined,
): string {
  return jobs?.find((j) => j.jobId === jobId)?.videoTitle ?? jobId;
}

export function ChannelShippingQueuePage() {
  const params = useParams();
  const contentId = typeof params.contentId === 'string' ? params.contentId : '';
  const queueQuery = useChannelPublishQueueQuery({ contentId }, { enabled: Boolean(contentId) });
  const jobsQuery = useAdminJobs({ contentId, limit: 200 });
  const jobs = jobsQuery.data?.items;

  const rows = useMemo(() => {
    const items = queueQuery.data ?? [];
    return [...items].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [queueQuery.data]);

  return (
    <div className="space-y-8">
      <AdminPageBack href={`/content/${encodeURIComponent(contentId)}/jobs`} label="채널로" />
      <ContentChannelSubnav contentId={contentId} />
      <AdminPageHeader
        title="출고 큐"
        subtitle="이 채널에서 다음에 내보낼 제작 아이템을 모아 둡니다. 예약·즉시 발행은 추후 이 화면에서 다룹니다."
      />

      <div className="rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-2 font-medium">우선순위</th>
              <th className="px-4 py-2 font-medium">제작 아이템</th>
              <th className="px-4 py-2 font-medium">발행 타깃</th>
              <th className="px-4 py-2 font-medium">상태</th>
              <th className="px-4 py-2 font-medium">추가일</th>
              <th className="px-4 py-2 font-medium">메모</th>
            </tr>
          </thead>
          <tbody>
            {queueQuery.isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-muted-foreground">
                  불러오는 중…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-muted-foreground">
                  출고 큐가 비어 있습니다. 제작 아이템 상세의「렌더·출고 준비」에서 추가하세요.
                </td>
              </tr>
            ) : (
              rows.map((row: ChannelPublishQueueItem, i: number) => (
                <tr key={row.queueItemId} className="border-b last:border-0">
                  <td className="px-4 py-2 tabular-nums">{i + 1}</td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/jobs/${encodeURIComponent(row.jobId)}/publish`}
                      className="font-medium text-primary hover:underline"
                    >
                      {titleForJob(row.jobId, jobs)}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {row.publishTargets.length > 0
                      ? row.publishTargets.map((t) => t.platform).join(', ')
                      : '—'}
                  </td>
                  <td className="px-4 py-2">{row.status}</td>
                  <td className="px-4 py-2 text-muted-foreground tabular-nums">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-2 text-muted-foreground">
                    {row.note ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
