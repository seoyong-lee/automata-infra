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
    <div className="space-y-3 border-b border-border pb-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          현재 작업
        </span>
        {currentStage ? (
          <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-foreground">
            {statusLabel(currentStage.state)}
          </span>
        ) : null}
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-foreground">
          {currentStageMeta?.title ?? currentStage?.label ?? '상세 작업'}
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          {currentStageMeta?.description ??
            '선택된 단계의 상세 작업과 상태를 아래에서 확인할 수 있습니다.'}
        </p>
      </div>
    </div>
  );
}
