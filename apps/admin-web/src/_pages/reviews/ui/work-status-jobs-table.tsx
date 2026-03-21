'use client';

import { useRouter } from 'next/navigation';

import type { AdminJob } from '@/entities/admin-job';

type WorkStatusJobsTableProps = {
  jobs: AdminJob[];
  isLoading: boolean;
};

export function WorkStatusJobsTable({ jobs, isLoading }: WorkStatusJobsTableProps) {
  const router = useRouter();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">목록을 불러오는 중입니다…</p>;
  }

  if (jobs.length === 0) {
    return <p className="text-sm text-muted-foreground">표시할 콘텐츠 작업이 없습니다.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">제목</th>
            <th className="px-4 py-3">콘텐츠 ID</th>
            <th className="px-4 py-3">채널</th>
            <th className="px-4 py-3">상태</th>
            <th className="px-4 py-3">수정 시각</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr
              key={job.jobId}
              role="link"
              tabIndex={0}
              className="cursor-pointer border-b border-border/70 transition-colors hover:bg-muted/40"
              onClick={() => router.push(`/jobs/${job.jobId}/overview`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  router.push(`/jobs/${job.jobId}/overview`);
                }
              }}
            >
              <td className="max-w-[240px] truncate px-4 py-3 font-medium text-foreground">
                {job.videoTitle || '—'}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{job.jobId}</td>
              <td className="px-4 py-3 text-muted-foreground">{job.contentId}</td>
              <td className="px-4 py-3">
                <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
                  {job.status}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{job.updatedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
