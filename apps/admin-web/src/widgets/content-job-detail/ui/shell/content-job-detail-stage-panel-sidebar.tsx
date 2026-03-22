'use client';

import { cn } from '@packages/ui';
import Link from 'next/link';

import type {
  ReadinessChip,
  WorkflowNavItem,
  WorkflowStageMeta,
} from '../../lib/content-job-workflow';

type ContentJobDetailStagePanelSidebarProps = {
  currentStageMeta: WorkflowStageMeta | null;
  nextStage: WorkflowNavItem | null;
  nextStageMeta: WorkflowStageMeta | null;
  readinessChips: ReadinessChip[];
};

function chipTone(state: ReadinessChip['state']): string {
  if (state === 'done') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100';
  }
  if (state === 'blocked') {
    return 'border-destructive/30 bg-destructive/10 text-destructive';
  }
  return 'border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100';
}

function renderNextStep(
  currentStageMeta: WorkflowStageMeta | null,
  nextStage: WorkflowNavItem | null,
  nextStageMeta: WorkflowStageMeta | null,
) {
  if (!nextStage || !nextStageMeta) {
    return (
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        마지막 단계입니다. 결과를 검토하고 필요한 경우 이전 단계로 돌아가 보완하세요.
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <div>
        <p className="text-sm font-semibold text-foreground">{nextStageMeta.title}</p>
        <p className="text-xs leading-5 text-muted-foreground">{nextStageMeta.description}</p>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">{currentStageMeta?.nextHint}</p>
      <Link
        href={nextStage.href}
        scroll={!nextStage.href.includes('#')}
        className="inline-flex text-sm font-medium text-primary hover:underline"
      >
        다음 단계 보기
      </Link>
    </div>
  );
}

export function ContentJobDetailStagePanelSidebar({
  currentStageMeta,
  nextStage,
  nextStageMeta,
  readinessChips,
}: ContentJobDetailStagePanelSidebarProps) {
  return (
    <aside className="space-y-4">
      <div className="rounded-xl border border-border bg-background p-4">
        <p className="text-xs font-medium text-muted-foreground">다음 단계</p>
        {renderNextStep(currentStageMeta, nextStage, nextStageMeta)}
      </div>
      <div className="rounded-xl border border-border bg-background p-4">
        <p className="text-xs font-medium text-muted-foreground">준비 상태 요약</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {readinessChips.map((chip) => (
            <Link
              key={chip.key}
              href={chip.href}
              className={cn(
                'inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                chipTone(chip.state),
              )}
            >
              {chip.label}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
