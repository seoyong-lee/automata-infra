'use client';

import type { AdminJob } from '@/entities/admin-job';
import { AdminDataTable, type AdminDataTableColumnClassName } from '@/shared/ui/admin-data-table';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { KeyboardEvent, ReactNode } from 'react';
import { useMemo } from 'react';

import type { ColumnDef } from '@tanstack/react-table';

import { createContentJobsColumns, type ContentJobsColumnsOptions } from './content-jobs-columns';

type Props = {
  jobs: AdminJob[];
  isLoading: boolean;
  /** When set, “새 제작 아이템” goes to `/content/:contentId/jobs/new`. */
  contentId?: string;
  /** 지정 시 위 규칙 대신 이 URL로 새 제작 아이템 생성 링크를 둔다. */
  newJobHrefOverride?: string;
  /** 카탈로그와 맞추면 연결 채널 열에 이름·링크가 보인다. */
  channelLabelById?: ContentJobsColumnsOptions['channelLabelById'];
  /** 행 우측 액션(예: 미연결 제작 아이템 → 채널 연결). */
  renderJobAction?: (job: AdminJob) => ReactNode;
  toolbarEnd?: ReactNode | null;
};

function getJobColumnClassName(columnId: string): AdminDataTableColumnClassName {
  switch (columnId) {
    case 'phase':
      return { header: 'w-[4.5rem]', cell: 'whitespace-nowrap' };
    case 'statusLabel':
      return { header: 'min-w-[7rem]' };
    case 'actionNeeded':
      return { header: 'min-w-[6.5rem]' };
    case 'contentId':
      return { header: 'hidden lg:table-cell', cell: 'hidden lg:table-cell' };
    case 'updatedAt':
      return { header: 'hidden sm:table-cell', cell: 'hidden sm:table-cell' };
    case 'openDetail':
      return { header: 'w-[4rem]', cell: 'w-[4rem]' };
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
  channelLabelById,
  renderJobAction,
  toolbarEnd,
}: Props) {
  const router = useRouter();
  const columns = useMemo((): ColumnDef<AdminJob>[] => {
    const base = createContentJobsColumns({
      channelLabelById,
      hideChannelColumn: Boolean(contentId),
    });
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
  }, [renderJobAction, channelLabelById, contentId]);

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
        <p className="text-sm text-muted-foreground">표시할 제작 아이템이 없습니다.</p>
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
            toolbarEnd === undefined ? (
              <Link
                href={newJobHref}
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-md bg-linear-to-br from-admin-primary to-admin-primary-container px-5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition-all hover:opacity-95"
              >
                새 제작 아이템
              </Link>
            ) : (
              toolbarEnd
            )
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
