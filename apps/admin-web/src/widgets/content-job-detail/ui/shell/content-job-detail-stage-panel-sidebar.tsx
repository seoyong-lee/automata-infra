'use client';

import Link from 'next/link';

import type { WorkflowNavItem, WorkflowStageMeta } from '../../lib/content-job-workflow';

type ContentJobDetailStagePanelSidebarProps = {
  currentStageMeta: WorkflowStageMeta | null;
  nextStage: WorkflowNavItem | null;
  nextStageMeta: WorkflowStageMeta | null;
};

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
}: ContentJobDetailStagePanelSidebarProps) {
  return (
    <aside>
      <div className="rounded-xl border border-border bg-background p-4">
        <p className="text-xs font-medium text-muted-foreground">다음 단계</p>
        {renderNextStep(currentStageMeta, nextStage, nextStageMeta)}
      </div>
    </aside>
  );
}
