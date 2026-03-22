'use client';

import { cn } from '@packages/ui';
import Link from 'next/link';
import { Fragment } from 'react';

import { getWorkflowStageMeta, type WorkflowNavItem } from '../../lib/content-job-workflow';

type ContentJobWorkflowBarProps = {
  stages: WorkflowNavItem[];
};

function stateBadgeLabel(stage: WorkflowNavItem): string {
  if (stage.isCurrent) {
    return '현재';
  }
  if (stage.state === 'complete') {
    return '완료';
  }
  if (stage.state === 'blocked') {
    return '대기';
  }
  return '다음';
}

export function ContentJobWorkflowBar({ stages }: ContentJobWorkflowBarProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1 px-1">
        <p className="text-xs font-medium text-muted-foreground">작업 플로우</p>
        <p className="text-sm text-muted-foreground">
          위쪽에서 전체 단계를 보고, 원하는 단계로 바로 전환한 뒤 아래 패널에서 작업합니다.
        </p>
      </div>
      <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
        <div className="flex min-w-max items-stretch gap-3">
          {stages.map((stage, index) => {
            const meta = getWorkflowStageMeta(stage.key);
            return (
              <Fragment key={stage.key}>
                <Link
                  href={stage.href}
                  scroll={!stage.href.includes('#')}
                  className={cn(
                    'flex w-40 shrink-0 flex-col rounded-2xl border bg-background p-3 transition-colors',
                    stage.isCurrent
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : stage.state === 'complete'
                        ? 'border-emerald-500/35'
                        : stage.state === 'blocked'
                          ? 'border-border opacity-70'
                          : 'border-border hover:bg-accent hover:text-accent-foreground',
                  )}
                  title={stage.state === 'blocked' ? '선행 단계를 먼저 완료하세요.' : undefined}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'inline-flex h-8 w-8 items-center justify-center rounded-xl text-xs font-semibold',
                        stage.isCurrent
                          ? 'bg-primary text-primary-foreground'
                          : stage.state === 'complete'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200'
                            : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {stateBadgeLabel(stage)}
                    </span>
                  </div>
                  <div className="mt-4 space-y-1">
                    <p className="text-sm font-semibold text-foreground">{stage.label}</p>
                    <p className="line-clamp-3 text-xs leading-5 text-muted-foreground">
                      {meta.description}
                    </p>
                  </div>
                </Link>
                {index < stages.length - 1 ? (
                  <div className="flex w-7 shrink-0 items-center" aria-hidden>
                    <div className="h-px w-full bg-border" />
                  </div>
                ) : null}
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
