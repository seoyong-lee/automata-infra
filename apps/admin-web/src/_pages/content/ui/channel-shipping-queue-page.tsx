'use client';

import { useChannelPublishQueueQuery, type ChannelPublishQueueItem } from '@packages/graphql';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';

import { useAdminJobs } from '@/entities/admin-job';
import { ContentChannelPageShell } from './content-channel-page-shell';

function titleForJob(
  jobId: string,
  jobs: { jobId: string; videoTitle: string }[] | undefined,
): string {
  return jobs?.find((j) => j.jobId === jobId)?.videoTitle ?? jobId;
}

function queueStatusLabel(row: ChannelPublishQueueItem): string {
  if (row.status === 'SCHEDULED' && row.scheduledAt) {
    return `예약됨 · ${new Date(row.scheduledAt).toLocaleString()}`;
  }
  if (row.status === 'PUBLISHED') {
    return '처리 완료';
  }
  return '즉시 발행 대기';
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
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [queueQuery.data]);

  return (
    <ContentChannelPageShell
      contentId={contentId}
      title={({ label, contentId: shellContentId }) =>
        label ? `「${label}」의 출고 큐` : shellContentId ? '이 채널의 출고 큐' : '출고 큐'
      }
      subtitle="이 채널에서 다음에 처리할 제작 아이템을 오래된 순서대로 모아 둡니다. 예약 시각 조정과 실제 발행 실행은 예약·발행 화면에서 진행합니다."
    >
      <div className="rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-2 font-medium">대기 순서</th>
              <th className="px-4 py-2 font-medium">제작 아이템</th>
              <th className="px-4 py-2 font-medium">출고 대상</th>
              <th className="px-4 py-2 font-medium">상태</th>
              <th className="px-4 py-2 font-medium">추가일</th>
              <th className="px-4 py-2 font-medium">다음 단계</th>
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
                  <td className="px-4 py-2">{queueStatusLabel(row)}</td>
                  <td className="px-4 py-2 text-muted-foreground tabular-nums">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/content/${encodeURIComponent(contentId)}/schedule?job=${encodeURIComponent(row.jobId)}`}
                      className="text-primary hover:underline"
                    >
                      예약·발행으로 이동
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </ContentChannelPageShell>
  );
}
