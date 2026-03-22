'use client';

import { cn } from '@packages/ui';
import Link from 'next/link';

type ContentJobDetailScriptWorkspaceTabsProps = {
  jobId: string;
  activeTab: 'ideation' | 'scene';
};

const tabClassName =
  'inline-flex h-9 shrink-0 items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors';

const scriptWorkspaceTabs: Array<{
  key: 'ideation' | 'scene';
  label: string;
  description: string;
}> = [
  {
    key: 'ideation',
    label: '아이디어',
    description: '토픽 시드와 기획 메모를 다듬고 토픽 플랜을 다시 실행합니다.',
  },
  {
    key: 'scene',
    label: '씬 설계',
    description: 'Scene JSON 생성 결과를 검토하고 씬 구조를 직접 보정합니다.',
  },
];

export function ContentJobDetailScriptWorkspaceTabs({
  jobId,
  activeTab,
}: ContentJobDetailScriptWorkspaceTabsProps) {
  const activeMeta = scriptWorkspaceTabs.find((tab) => tab.key === activeTab);

  return (
    <div className="space-y-2">
      <div className="-mx-1 flex flex-wrap gap-2 px-1">
        {scriptWorkspaceTabs.map((tab) => (
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
      <p className="text-xs text-muted-foreground">{activeMeta?.description}</p>
    </div>
  );
}
