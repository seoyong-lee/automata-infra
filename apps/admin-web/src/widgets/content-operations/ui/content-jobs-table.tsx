'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/card';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@packages/ui/table';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, type ReactNode } from 'react';
import type { AdminJob } from '@/entities/admin-job';

import { ContentJobsTableRow } from './content-jobs-table-row';

type Props = {
  jobs: AdminJob[];
  isLoading: boolean;
  /** When set, “새 제작 잡” goes to `/content/:contentId/jobs/new`. */
  contentId?: string;
  contentLabel?: string;
};

type TableGridProps = {
  jobs: AdminJob[];
  onOpen: (jobId: string) => void;
};

function ContentJobsTableGrid({ jobs, onOpen }: TableGridProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-[140px]">상태</TableHead>
          <TableHead>제목</TableHead>
          <TableHead className="hidden md:table-cell">콘텐츠 타입</TableHead>
          <TableHead className="hidden lg:table-cell">채널</TableHead>
          <TableHead className="text-right">길이</TableHead>
          <TableHead className="hidden sm:table-cell">수정일</TableHead>
          <TableHead className="hidden xl:table-cell font-mono text-xs">Job ID</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="[&_td]:py-2.5">
        {jobs.map((job) => (
          <ContentJobsTableRow key={job.jobId} job={job} onOpen={onOpen} />
        ))}
      </TableBody>
    </Table>
  );
}

export function ContentJobsTable({ jobs, isLoading, contentId, contentLabel }: Props) {
  const router = useRouter();

  const newJobHref = contentId
    ? `/content/${encodeURIComponent(contentId)}/jobs/new`
    : '/content/new';

  const goToDetail = useCallback(
    (jobId: string) => {
      router.push(`/jobs/${jobId}/script`);
    },
    [router],
  );

  let body: ReactNode = null;
  if (isLoading) {
    body = <p className="text-sm text-muted-foreground">목록을 불러오는 중입니다…</p>;
  } else if (jobs.length === 0) {
    body = <p className="text-sm text-muted-foreground">표시할 제작 잡이 없습니다.</p>;
  } else {
    body = <ContentJobsTableGrid jobs={jobs} onOpen={goToDetail} />;
  }

  return (
    <Card className="flex w-full flex-col gap-4">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-lg">
            {contentLabel ? `${contentLabel} · ` : null}제작 잡 목록
          </CardTitle>
          <CardDescription>
            각 행은 한 건의 제작 잡입니다. 행을 누르면 상세(스크립트·영상·이미지·업로드)로
            이동합니다. 콘텐츠(채널)는 먼저 등록한 뒤, 그 하위에만 잡을 둡니다.
          </CardDescription>
        </div>
        <Link
          href={newJobHref}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          새 제작 잡
        </Link>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
