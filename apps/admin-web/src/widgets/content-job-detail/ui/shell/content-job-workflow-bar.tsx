'use client';

import { cn } from '@packages/ui';
import Link from 'next/link';

import type { WorkflowNavItem } from '../../lib/content-job-workflow';

type ContentJobWorkflowBarProps = {
  stages: WorkflowNavItem[];
};

export function ContentJobWorkflowBar({ stages }: ContentJobWorkflowBarProps) {
  return (
    <div className="space-y-2">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
        {stages.map((stage) => (
          <Link
            key={stage.key}
            href={stage.href}
            scroll={!stage.href.includes('#')}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              stage.isCurrent
                ? 'border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
                : stage.state === 'complete'
                  ? 'border-emerald-500/40 text-emerald-800 dark:text-emerald-200'
                  : stage.state === 'blocked'
                    ? 'border-border text-muted-foreground opacity-70'
                    : 'border-border bg-background hover:bg-accent hover:text-accent-foreground',
            )}
            title={stage.state === 'blocked' ? '선행 단계를 먼저 완료하세요.' : undefined}
          >
            {stage.state === 'complete' && !stage.isCurrent ? (
              <span className="tabular-nums text-[10px] opacity-80" aria-hidden>
                ✓
              </span>
            ) : null}
            {stage.label}
          </Link>
        ))}
      </div>
      <p className="px-1 text-[11px] text-muted-foreground">
        단계를 누르면 해당 화면으로 전환됩니다. 발행 탭 안에서는 검수·발행 문구·출고 대기 구역으로
        바로 이동합니다.
      </p>
    </div>
  );
}
