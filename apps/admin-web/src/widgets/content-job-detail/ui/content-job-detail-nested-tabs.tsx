'use client';

import { cn } from '@packages/ui';
import Link from 'next/link';

import { workspaceViews } from '../lib/workspace-views';
import type { WorkspaceView } from '../model/types';

type ContentJobDetailNestedTabsProps = {
  jobId: string;
  activeView: WorkspaceView;
};

const tabClassName =
  'inline-flex h-9 shrink-0 items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors';

export function ContentJobDetailNestedTabs({ jobId, activeView }: ContentJobDetailNestedTabsProps) {
  if (!jobId) {
    return null;
  }

  const activeCopy = workspaceViews.find((v) => v.key === activeView)?.description;

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        콘텐츠 제작 단계
      </p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <Link
          href="/jobs"
          className={cn(
            tabClassName,
            'border border-border bg-background hover:bg-accent hover:text-accent-foreground',
          )}
        >
          목록
        </Link>
        {workspaceViews.map((view) => (
          <Link
            key={view.key}
            href={`/jobs/${jobId}/${view.key}`}
            className={cn(
              tabClassName,
              activeView === view.key
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-background hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {view.label}
          </Link>
        ))}
      </div>
      {activeCopy ? <p className="text-sm text-muted-foreground">{activeCopy}</p> : null}
    </div>
  );
}
