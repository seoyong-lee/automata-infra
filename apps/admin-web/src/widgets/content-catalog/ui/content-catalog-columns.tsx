'use client';

import { Button } from '@packages/ui/button';
import type { ColumnDef } from '@tanstack/react-table';
import { Link2, Trash2, Youtube } from 'lucide-react';

import type { AdminContent } from '@/entities/admin-content';
import { DataTableColumnHeader } from '@/shared/ui/data-table-column-header';

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function getChannelInitials(label: string): string {
  const cleaned = label.trim();
  if (!cleaned) {
    return 'CH';
  }
  const parts = cleaned.split(/\s+/).slice(0, 2);
  return parts
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
}

function getChannelStatus(content: AdminContent): {
  label: string;
  className: string;
} {
  if (content.youtubeSecretName || content.youtubeUpdatedAt) {
    return {
      label: content.autoPublishEnabled ? '운영 중' : '연결됨',
      className: content.autoPublishEnabled
        ? 'bg-admin-status-success-surface text-admin-status-success'
        : 'bg-admin-surface-section text-admin-primary',
    };
  }

  return {
    label: '설정 필요',
    className: 'bg-admin-status-warning-surface text-admin-status-warning',
  };
}

export function createContentCatalogColumns(options: {
  onDelete: (contentId: string) => void;
  deletingId?: string;
  activeJobCountByContentId?: Record<string, number>;
}): ColumnDef<AdminContent>[] {
  const dateSortFn: ColumnDef<AdminContent>['sortingFn'] = (rowA, rowB, columnId) => {
    const a = new Date(String(rowA.getValue(columnId))).getTime();
    const b = new Date(String(rowB.getValue(columnId))).getTime();
    return a - b;
  };

  const activeJobCountByContentId = options.activeJobCountByContentId ?? {};

  return [
    {
      accessorKey: 'label',
      header: ({ column }) => <DataTableColumnHeader column={column} title="채널" />,
      cell: ({ row }) => {
        const content = row.original;
        return (
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-admin-surface-section font-admin-display text-sm font-bold text-admin-primary">
              {getChannelInitials(content.label)}
            </div>
            <div className="min-w-0 space-y-1">
              <p className="truncate font-semibold text-admin-text-strong">{content.label}</p>
              <p className="truncate font-mono text-[11px] text-admin-text-muted">
                {content.contentId}
              </p>
            </div>
          </div>
        );
      },
      filterFn: 'includesString',
    },
    {
      id: 'platforms',
      accessorFn: (row) => row.youtubeSecretName || row.youtubeAccountType || '',
      header: ({ column }) => <DataTableColumnHeader column={column} title="플랫폼" />,
      cell: ({ row }) => {
        const content = row.original;
        const connected = Boolean(content.youtubeSecretName || content.youtubeAccountType);
        return (
          <div className="flex items-center gap-2">
            <span
              className={
                connected
                  ? 'inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600'
                  : 'inline-flex items-center gap-1 rounded-full bg-admin-surface-section px-2.5 py-1 text-xs font-medium text-admin-text-muted'
              }
            >
              <Youtube className="size-3.5" />
              YouTube
            </span>
            {content.playlistId ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-admin-surface-section px-2.5 py-1 text-xs font-medium text-admin-text-muted">
                <Link2 className="size-3.5" />
                Playlist
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      id: 'activeJobs',
      accessorFn: (row) => activeJobCountByContentId[row.contentId] ?? 0,
      header: ({ column }) => <DataTableColumnHeader column={column} title="활성 아이템" />,
      cell: ({ row }) => (
        <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          {activeJobCountByContentId[row.original.contentId] ?? 0} Active
        </span>
      ),
    },
    {
      id: 'channelStatus',
      accessorFn: (row) => getChannelStatus(row).label,
      header: ({ column }) => <DataTableColumnHeader column={column} title="상태" />,
      cell: ({ row }) => {
        const status = getChannelStatus(row.original);
        return (
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
          >
            {status.label}
          </span>
        );
      },
    },
    {
      accessorKey: 'updatedAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="최근 갱신" />,
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="tabular-nums text-sm text-admin-text-strong">
            {formatDateTime(row.original.updatedAt)}
          </p>
          <p className="text-[11px] text-admin-text-muted">
            {row.original.autoPublishEnabled ? '자동 공개 사용' : '수동 공개'}
          </p>
        </div>
      ),
      sortingFn: dateSortFn,
    },
    {
      id: 'actions',
      header: () => <span className="text-admin-text-muted">작업</span>,
      cell: ({ row }) => {
        const contentId = row.original.contentId;
        const deleting = options.deletingId === contentId;
        return (
          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            <a
              href={`/content/${encodeURIComponent(contentId)}/jobs`}
              className="inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium text-admin-primary transition-colors hover:bg-admin-surface-section"
            >
              열기
            </a>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-admin-text-muted hover:bg-admin-status-error-surface hover:text-admin-status-error"
              disabled={deleting}
              onClick={() => options.onDelete(contentId)}
            >
              <Trash2 className="size-4" />
              <span className="sr-only">채널 삭제</span>
            </Button>
          </div>
        );
      },
    },
  ];
}
