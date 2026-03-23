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
      <p className="mt-2 text-xs leading-5 text-admin-text-muted">
        마지막 단계입니다. 결과를 검토하고 필요한 경우 이전 단계로 돌아가 보완하세요.
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <div>
        <p className="text-sm font-semibold text-admin-text-strong">{nextStageMeta.title}</p>
        <p className="text-xs leading-5 text-admin-text-muted">{nextStageMeta.description}</p>
      </div>
      <p className="text-xs leading-5 text-admin-text-muted">{currentStageMeta?.nextHint}</p>
      <Link
        href={nextStage.href}
        scroll={!nextStage.href.includes('#')}
        className="inline-flex text-sm font-medium text-admin-primary hover:underline"
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
    <aside className="xl:sticky xl:top-6 xl:self-start">
      <div className="rounded-xl border border-admin-outline-ghost bg-admin-surface-section p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-admin-primary">
          Next Step
        </p>
        <p className="mt-2 text-sm leading-6 text-admin-text-muted">
          현재 단계가 끝나면 어디로 이어지는지와 다음 확인 포인트를 보여줍니다.
        </p>
        {renderNextStep(currentStageMeta, nextStage, nextStageMeta)}
      </div>
    </aside>
  );
}
