'use client';

import { cn } from '@packages/ui';
import Link from 'next/link';

type ContentJobDetailScriptWorkspaceTabsProps = {
  jobId: string;
  activeTab: 'ideation' | 'scene';
};

const tabClassName =
  'inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition-colors';

const scriptWorkspaceTabs: Array<{
  key: 'ideation' | 'scene';
  label: string;
  description: string;
}> = [
  {
    key: 'ideation',
    label: 'Ideation',
    description: 'Refine the topic seed and creative brief, then rerun the topic plan.',
  },
  {
    key: 'scene',
    label: 'Scene',
    description: 'Review the generated scene payload and refine the active scene directly.',
  },
];

export function ContentJobDetailScriptWorkspaceTabs({
  jobId,
  activeTab,
}: ContentJobDetailScriptWorkspaceTabsProps) {
  const activeMeta = scriptWorkspaceTabs.find((tab) => tab.key === activeTab);

  return (
    <div className="space-y-2">
      <div className="rounded-2xl border border-admin-outline-ghost bg-admin-surface-section p-2">
        <div className="grid gap-2 md:grid-cols-2">
          {scriptWorkspaceTabs.map((tab) => (
            <Link
              key={tab.key}
              href={`/jobs/${jobId}/${tab.key}`}
              className={cn(
                tabClassName,
                activeTab === tab.key
                  ? 'bg-admin-surface-card text-admin-text-strong shadow-sm ring-1 ring-admin-outline-ghost'
                  : 'text-admin-text-muted hover:bg-admin-surface-card hover:text-admin-text-strong',
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
      <p className="text-xs text-admin-text-muted">{activeMeta?.description}</p>
    </div>
  );
}
