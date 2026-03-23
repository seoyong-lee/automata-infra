'use client';

import type { WorkflowNavItem, WorkflowStageMeta } from '../../lib/content-job-workflow';

type ContentJobDetailStagePanelHeaderProps = {
  currentStage: WorkflowNavItem | null;
  currentStageMeta: WorkflowStageMeta | null;
};

function statusLabel(state: WorkflowNavItem['state']): string {
  if (state === 'complete') {
    return '완료';
  }
  if (state === 'blocked') {
    return '막힘';
  }
  return '진행 중';
}

export function ContentJobDetailStagePanelHeader({
  currentStage,
  currentStageMeta,
}: ContentJobDetailStagePanelHeaderProps) {
  return (
    <div className="space-y-4 border-b border-admin-outline-ghost pb-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-admin-surface-section px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-admin-primary">
          Current Stage
        </span>
        {currentStage ? (
          <span className="rounded-full border border-admin-outline-ghost px-2.5 py-1 text-[11px] font-medium text-admin-text-strong">
            {statusLabel(currentStage.state)}
          </span>
        ) : null}
      </div>
      <div className="space-y-1">
        <h2 className="font-admin-display text-2xl font-extrabold tracking-tight text-admin-primary">
          {currentStageMeta?.title ?? currentStage?.label ?? '현재 단계'}
        </h2>
        <p className="text-sm leading-6 text-admin-text-muted">
          {currentStageMeta?.description ??
            '현재 선택된 단계에서 필요한 작업과 다음 이동 경로를 이 영역에서 확인합니다.'}
        </p>
      </div>
    </div>
  );
}
