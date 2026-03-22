'use client';

import { ContentJobDetailSceneBuildPanel } from '@/features/content-job-detail';

import type { ContentJobDetailPageData } from '../../model/useContentJobDetailPageData';
import { ContentJobDetailStageApprovalWorkbench } from '../stage/content-job-detail-stage-approval-workbench';

type Props = {
  jobId: string;
  pageData: ContentJobDetailPageData;
};

export function ContentJobDetailSceneTab({ jobId, pageData }: Props) {
  const { detailVm } = pageData;
  return (
    <div className="space-y-6">
      <ContentJobDetailSceneBuildPanel
        key={detailVm.sceneJsonKey}
        initialValue={detailVm.sceneJsonInitialValue}
        runError={pageData.runSceneJsonError}
        saveError={pageData.updateSceneJsonError}
        isRunning={pageData.isRunningSceneJson}
        isSaving={pageData.isSavingSceneJson}
        onRun={pageData.runSceneJson}
        onSave={pageData.saveSceneJson}
      />
      <ContentJobDetailStageApprovalWorkbench
        jobId={jobId}
        stageType="SCENE_JSON"
        approvedExecutionId={pageData.detail?.job.approvedSceneExecutionId}
        onApprove={pageData.approvePipelineExecution}
        isApproving={pageData.isApprovingPipelineExecution}
        approveError={pageData.approvePipelineExecutionError}
      />
    </div>
  );
}
