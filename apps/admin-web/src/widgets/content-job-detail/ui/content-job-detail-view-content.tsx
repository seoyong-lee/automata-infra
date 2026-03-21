'use client';

import {
  ContentJobDetailSceneBuildPanel,
  ContentJobDetailSeedFormPanel,
} from '@/features/content-job-detail';
import type { AssetStage, JobDetailRouteTabKey } from '../model';
import type { ContentJobDetailPageData } from '../model/useContentJobDetailPageData';
import { ContentJobDetailAssetsHubView } from './content-job-detail-assets-hub-view';
import { ContentJobDetailOverviewView } from './content-job-detail-overview-view';
import { ContentJobDetailPublishView } from './content-job-detail-publish-view';
import { ContentJobDetailStageApprovalWorkbench } from './content-job-detail-stage-approval-workbench';
import { ContentJobDetailTimelineView } from './content-job-detail-timeline-view';

type ContentJobDetailViewContentProps = {
  jobId: string;
  activeTab: JobDetailRouteTabKey;
  assetStage: AssetStage;
  pageData: ContentJobDetailPageData;
};

export function ContentJobDetailViewContent({
  jobId,
  activeTab,
  assetStage,
  pageData,
}: ContentJobDetailViewContentProps) {
  const { detailVm } = pageData;

  if (activeTab === 'overview') {
    return (
      <ContentJobDetailOverviewView
        jobId={jobId}
        detail={pageData.detail}
        experimentOptions={detailVm.experimentOptions}
        readyAssetCount={detailVm.readyAssetCount}
        stylePreset={detailVm.seedFormInitialValue.stylePreset}
      />
    );
  }

  if (activeTab === 'ideation') {
    return (
      <div className="space-y-6">
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

  if (activeTab === 'scene') {
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

  if (activeTab === 'assets') {
    return (
      <ContentJobDetailAssetsHubView jobId={jobId} assetStage={assetStage} pageData={pageData} />
    );
  }

  if (activeTab === 'publish') {
    return <ContentJobDetailPublishView jobId={jobId} pageData={pageData} />;
  }

  if (activeTab === 'timeline') {
    return <ContentJobDetailTimelineView jobId={jobId} />;
  }

  return null;
}
