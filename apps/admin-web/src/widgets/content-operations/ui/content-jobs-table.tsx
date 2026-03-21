'use client';

import type { AdminJob } from '@/entities/admin-job';
import { AdminDataTable, type AdminDataTableColumnClassName } from '@/shared/ui/admin-data-table';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { KeyboardEvent } from 'react';
import { useMemo } from 'react';

import { createContentJobsColumns } from './content-jobs-columns';

type Props = {
  jobs: AdminJob[];
  isLoading: boolean;
  /** When set, “새 제작 잡” goes to `/content/:contentId/jobs/new`. */
  contentId?: string;
};

function getJobColumnClassName(columnId: string): AdminDataTableColumnClassName {
  switch (columnId) {
    case 'status':
      return { header: 'min-w-[140px]' };
    case 'contentType':
      return { header: 'hidden md:table-cell', cell: 'hidden md:table-cell' };
    case 'contentId':
      return { header: 'hidden lg:table-cell', cell: 'hidden lg:table-cell' };
    case 'targetDurationSec':
      return { header: 'text-right [&_button]:ml-auto', cell: 'text-right' };
    case 'updatedAt':
      return { header: 'hidden sm:table-cell', cell: 'hidden sm:table-cell' };
    case 'jobId':
      return { header: 'hidden xl:table-cell font-mono text-xs', cell: 'hidden xl:table-cell' };
    default:
      return {};
  }
}

export function ContentJobsTable({ jobs, isLoading, contentId }: Props) {
  const router = useRouter();
  const columns = useMemo(() => createContentJobsColumns(), []);

  const newJobHref = contentId
    ? `/content/${encodeURIComponent(contentId)}/jobs/new`
    : '/content/new';

  const goToJob = (jobId: string) => {
    router.push(`/jobs/${jobId}/script`);
  };

  const onRowKeyDown = (e: KeyboardEvent<HTMLTableRowElement>, jobId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goToJob(jobId);
    }
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">목록을 불러오는 중입니다…</p>
      ) : null}
      {!isLoading && jobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">표시할 제작 잡이 없습니다.</p>
      ) : null}
      {!isLoading && jobs.length > 0 ? (
        <AdminDataTable<AdminJob>
          data={jobs}
          columns={columns}
          getRowId={(row) => row.jobId}
          initialSorting={[{ id: 'updatedAt', desc: true }]}
          filterColumnId="videoTitle"
          filterPlaceholder="제목 검색…"
          toolbarEnd={
            <Link
              href={newJobHref}
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              새 잡 만들기
            </Link>
          }
          getColumnClassName={getJobColumnClassName}
          tableBodyClassName="[&_td]:py-2.5"
          rowProps={(row) => ({
            role: 'link',
            tabIndex: 0,
            className: 'cursor-pointer',
            onClick: () => goToJob(row.original.jobId),
            onKeyDown: (e) => onRowKeyDown(e, row.original.jobId),
          })}
        />
      ) : null}
    </div>
  );
}
