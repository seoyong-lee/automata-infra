'use client';

import type { WorkspaceView } from '../model';
import type { ContentJobDetailPageData } from '../model/useContentJobDetailPageData';
import { ContentJobDetailAssetsView } from './content-job-detail-assets-view';
import { ContentJobDetailJobsView } from './content-job-detail-jobs-view';
import { ContentJobDetailLogsView } from './content-job-detail-logs-view';
import { ContentJobDetailOverviewView } from './content-job-detail-overview-view';
import { ContentJobDetailTemplatesView } from './content-job-detail-templates-view';
import { ContentJobDetailUploadsView } from './content-job-detail-uploads-view';

type ContentJobDetailViewContentProps = {
  activeView: WorkspaceView;
  pageData: ContentJobDetailPageData;
};

export function ContentJobDetailViewContent({
  activeView,
  pageData,
}: ContentJobDetailViewContentProps) {
  const { detail, detailVm } = pageData;

  if (activeView === 'overview') {
    return (
      <ContentJobDetailOverviewView
        detail={detail}
        experimentOptions={detailVm.experimentOptions}
        readyAssetCount={detailVm.readyAssetCount}
        stylePreset={detailVm.seedFormInitialValue.stylePreset}
      />
    );
  }

  if (activeView === 'jobs') {
    return (
      <ContentJobDetailJobsView
        compareRows={detailVm.compareRows}
        runSceneJsonError={pageData.runSceneJsonError}
        runTopicPlanError={pageData.runTopicPlanError}
        sceneJsonInitialValue={detailVm.sceneJsonInitialValue}
        sceneJsonKey={detailVm.sceneJsonKey}
        seedFormInitialValue={detailVm.seedFormInitialValue}
        seedFormKey={detailVm.seedFormKey}
        updateSceneJsonError={pageData.updateSceneJsonError}
        updateTopicSeedError={pageData.updateTopicSeedError}
        isRunningSceneJson={pageData.isRunningSceneJson}
        isRunningTopicPlan={pageData.isRunningTopicPlan}
        isSavingSceneJson={pageData.isSavingSceneJson}
        isSavingTopicSeed={pageData.isSavingTopicSeed}
        onRunSceneJson={pageData.runSceneJson}
        onRunTopicPlan={pageData.runTopicPlan}
        onSaveSceneJson={pageData.saveSceneJson}
        onSaveTopicSeed={pageData.saveTopicSeed}
      />
    );
  }

  if (activeView === 'assets') {
    return (
      <ContentJobDetailAssetsView
        detail={detail}
        error={pageData.runAssetGenerationError}
        readyAssetCount={detailVm.readyAssetCount}
        isRunning={pageData.isRunningAssetGeneration}
        onRun={pageData.runAssetGeneration}
      />
    );
  }

  if (activeView === 'uploads') {
    return (
      <ContentJobDetailUploadsView
        detail={detail}
        error={pageData.requestUploadError}
        isUploading={pageData.isUploading}
        onOpenReviews={pageData.openReviews}
        onUpload={pageData.upload}
      />
    );
  }

  if (activeView === 'templates') {
    return (
      <ContentJobDetailTemplatesView
        compareRows={detailVm.compareRows}
        experimentOptions={detailVm.experimentOptions}
      />
    );
  }

  return <ContentJobDetailLogsView logs={detailVm.logs} />;
}
