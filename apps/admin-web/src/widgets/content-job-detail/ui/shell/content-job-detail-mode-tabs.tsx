'use client';

import { cn } from '@packages/ui';
import Link from 'next/link';

import type { JobDetailModeKey } from '../../lib/detail-workspace-tabs';

type ContentJobDetailModeTabsProps = {
  activeMode: JobDetailModeKey;
  ideationHref: string;
  workflowHref: string;
};

const tabClassName =
  'inline-flex h-9 shrink-0 items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors';

const MODE_META: Record<JobDetailModeKey, { label: string; description: string }> = {
  ideation: {
    label: '제작',
    description: '단건 영상 제작과 렌더 미리보기, 수정 반복에 집중합니다.',
  },
  workflow: {
    label: '운영',
    description: '단계 진행, 검수, 출고 준비와 실행 이력을 관리합니다.',
  },
};

export function ContentJobDetailModeTabs({
  activeMode,
  ideationHref,
  workflowHref,
}: ContentJobDetailModeTabsProps) {
  return (
    <div className="space-y-2">
      <div className="-mx-1 flex flex-wrap gap-2 px-1">
        {(
          [
            { key: 'ideation', href: ideationHref },
            { key: 'workflow', href: workflowHref },
          ] as const
        ).map(({ key, href }) => (
          <Link
            key={key}
            href={href}
            className={cn(
              tabClassName,
              activeMode === key
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-background hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {MODE_META[key].label}
          </Link>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{MODE_META[activeMode].description}</p>
    </div>
  );
}
