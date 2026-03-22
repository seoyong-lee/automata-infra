'use client';

import { ContentJobDetailSeedFormPanel } from '@/features/content-job-detail';

import type { ContentJobDetailPageData } from '../../model/useContentJobDetailPageData';
import { ContentJobDetailStageApprovalWorkbench } from '../stage/content-job-detail-stage-approval-workbench';
import { ContentJobDetailScriptWorkspaceTabs } from './content-job-detail-script-workspace-tabs';

type Props = {
  jobId: string;
  pageData: ContentJobDetailPageData;
};

export function ContentJobDetailIdeationTab({ jobId, pageData }: Props) {
  const { detailVm } = pageData;
  return (
    <div className="space-y-6">
      <ContentJobDetailScriptWorkspaceTabs jobId={jobId} activeTab="ideation" />
      <ContentJobDetailSeedFormPanel
        key={detailVm.seedFormKey}
        initialValue={detailVm.seedFormInitialValue}
        hasTopicPlan={Boolean(pageData.detail?.job.topicS3Key)}
        isRunningTopicPlan={pageData.isRunningTopicPlan}
        isSaving={pageData.isSavingTopicSeed}
        onRunTopicPlan={pageData.runTopicPlan}
        onSave={pageData.saveTopicSeed}
        runError={pageData.runTopicPlanError}
        saveError={pageData.updateTopicSeedError}
      />
      <ContentJobDetailStageApprovalWorkbench
        jobId={jobId}
        stageType="TOPIC_PLAN"
        approvedExecutionId={pageData.detail?.job.approvedTopicExecutionId}
        onApprove={pageData.approvePipelineExecution}
        isApproving={pageData.isApprovingPipelineExecution}
        approveError={pageData.approvePipelineExecutionError}
      />
    </div>
  );
}
