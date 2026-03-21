'use client';

import type { AdminJob } from '@/entities/admin-job';
import { AdminDataTable, type AdminDataTableColumnClassName } from '@/shared/ui/admin-data-table';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { KeyboardEvent, ReactNode } from 'react';
import { useMemo } from 'react';

import type { ColumnDef } from '@tanstack/react-table';

import { createContentJobsColumns } from './content-jobs-columns';

type Props = {
  jobs: AdminJob[];
  isLoading: boolean;
  /** When set, “새 제작 잡” goes to `/content/:contentId/jobs/new`. */
  contentId?: string;
  /** 지정 시 위 규칙 대신 이 URL로 새 잡 생성 링크를 둔다. */
  newJobHrefOverride?: string;
  /** 행 우측 액션(예: 미연결 잡 → 콘텐츠 연결). */
  renderJobAction?: (job: AdminJob) => ReactNode;
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
    case 'jobActions':
      return { header: 'w-[140px]', cell: 'w-[140px]' };
    default:
      return {};
  }
}

export function ContentJobsTable({
  jobs,
  isLoading,
  contentId,
  newJobHrefOverride,
  renderJobAction,
}: Props) {
  const router = useRouter();
  const columns = useMemo((): ColumnDef<AdminJob>[] => {
    const base = createContentJobsColumns();
    if (!renderJobAction) {
      return base;
    }
    return [
      ...base,
      {
        id: 'jobActions',
        header: () => <span className="text-muted-foreground">작업</span>,
        cell: ({ row }) => (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            {renderJobAction(row.original)}
          </div>
        ),
      },
    ];
  }, [renderJobAction]);

  const newJobHref =
    newJobHrefOverride ??
    (contentId ? `/content/${encodeURIComponent(contentId)}/jobs/new` : '/content/new');

  const goToJob = (jobId: string) => {
    router.push(`/jobs/${jobId}/overview`);
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
