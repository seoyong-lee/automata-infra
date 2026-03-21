'use client';

import { cn } from '@packages/ui';
import Link from 'next/link';

import { detailWorkspaceTabs, type DetailWorkspaceTabKey } from '../lib/detail-workspace-tabs';

type ContentJobDetailNestedTabsProps = {
  jobId: string;
  activeTab: DetailWorkspaceTabKey;
};

const tabClassName =
  'inline-flex h-9 shrink-0 items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors';

export function ContentJobDetailNestedTabs({ jobId, activeTab }: ContentJobDetailNestedTabsProps) {
  if (!jobId) {
    return null;
  }

  const activeCopy = detailWorkspaceTabs.find((v) => v.key === activeTab)?.description;

  return (
    <div className="mb-4">
      <div className="-mx-1 flex flex-wrap gap-2 px-1">
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
    </div>
  );
}
