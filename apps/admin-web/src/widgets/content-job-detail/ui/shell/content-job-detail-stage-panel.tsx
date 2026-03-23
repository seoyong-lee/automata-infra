'use client';

import type { ReactNode } from 'react';

import type { WorkflowNavItem, WorkflowStageMeta } from '../../lib/content-job-workflow';
import { ContentJobDetailStagePanelHeader } from './content-job-detail-stage-panel-header';
import { ContentJobDetailStagePanelSidebar } from './content-job-detail-stage-panel-sidebar';

type ContentJobDetailStagePanelProps = {
  currentStage: WorkflowNavItem | null;
  currentStageMeta: WorkflowStageMeta | null;
  nextStage: WorkflowNavItem | null;
  nextStageMeta: WorkflowStageMeta | null;
  children: ReactNode;
};

export function ContentJobDetailStagePanel({
  currentStage,
  currentStageMeta,
  nextStage,
  nextStageMeta,
  children,
}: ContentJobDetailStagePanelProps) {
  return (
    <section className="admin-page-shell p-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <ContentJobDetailStagePanelHeader
            currentStage={currentStage}
            currentStageMeta={currentStageMeta}
          />
          <div className="min-w-0">{children}</div>
        </div>
        <ContentJobDetailStagePanelSidebar
          currentStageMeta={currentStageMeta}
          nextStage={nextStage}
          nextStageMeta={nextStageMeta}
        />
      </div>
    </section>
  );
}
