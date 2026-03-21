'use client';

import { cn } from '@packages/ui';
import Link from 'next/link';

import { detailWorkspaceTabs, type DetailWorkspaceTabKey } from '../lib/detail-workspace-tabs';

type ContentJobDetailNestedTabsProps = {
  jobId: string;
  activeTab: DetailWorkspaceTabKey;
  /** 목록으로 돌아갈 경로 (기본: 콘텐츠 카탈로그). */
  listHref?: string;
};

const tabClassName =
  'inline-flex h-9 shrink-0 items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors';

export function ContentJobDetailNestedTabs({
  jobId,
  activeTab,
  listHref = '/content',
}: ContentJobDetailNestedTabsProps) {
  if (!jobId) {
    return null;
  }

  const activeCopy = detailWorkspaceTabs.find((v) => v.key === activeTab)?.description;

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        콘텐츠 상세
      </p>
      <div className="-mx-1 flex flex-wrap gap-2 px-1 pb-1">
        <Link
          href={listHref}
          className={cn(
            tabClassName,
            'border border-border bg-background hover:bg-accent hover:text-accent-foreground',
          )}
        >
          목록
        </Link>
        {detailWorkspaceTabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/jobs/${jobId}/${tab.key}`}
            className={cn(
              tabClassName,
              activeTab === tab.key
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-background hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {activeCopy ? <p className="text-sm text-muted-foreground">{activeCopy}</p> : null}
    </div>
  );
}
