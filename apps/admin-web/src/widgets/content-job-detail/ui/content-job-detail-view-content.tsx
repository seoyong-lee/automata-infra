'use client';

import {
  ContentJobDetailSceneBuildPanel,
  ContentJobDetailSeedFormPanel,
} from '@/features/content-job-detail';
import type { WorkspaceView } from '../model';
import type { ContentJobDetailPageData } from '../model/useContentJobDetailPageData';
import { ContentJobDetailAssetsView } from './content-job-detail-assets-view';
import { ContentJobDetailRenderReviewView } from './content-job-detail-render-review-view';
import { ContentJobDetailUploadsView } from './content-job-detail-uploads-view';

type ContentJobDetailViewContentProps = {
  activeView: WorkspaceView;
  pageData: ContentJobDetailPageData;
};

function ContentJobDetailIdeationView({ pageData }: { pageData: ContentJobDetailPageData }) {
  const { detailVm } = pageData;

  return (
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
  );
}

function ContentJobDetailScriptView({ pageData }: { pageData: ContentJobDetailPageData }) {
  const { detailVm } = pageData;

  return (
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
  );
}

function ContentJobDetailAssetStageView({
  pageData,
  stage,
}: {
  pageData: ContentJobDetailPageData;
  stage: 'image' | 'voice' | 'video';
}) {
  return (
    <ContentJobDetailAssetsView
      detail={pageData.detail}
      error={pageData.runAssetGenerationError}
      isRunning={pageData.isRunningAssetGeneration}
      onRun={pageData.runAssetGeneration}
      stage={stage}
    />
  );
}

function ContentJobDetailReviewStageView({ pageData }: { pageData: ContentJobDetailPageData }) {
  return (
    <ContentJobDetailRenderReviewView
      detail={pageData.detail}
      onOpenReviews={pageData.openReviews}
      readyAssetCount={pageData.detailVm.readyAssetCount}
    />
  );
}

function ContentJobDetailUploadStageView({ pageData }: { pageData: ContentJobDetailPageData }) {
  return (
    <ContentJobDetailUploadsView
      detail={pageData.detail}
      error={pageData.requestUploadError}
      isUploading={pageData.isUploading}
      onOpenReviews={pageData.openReviews}
      onUpload={pageData.upload}
    />
  );
}

export function ContentJobDetailViewContent({
  activeView,
  pageData,
}: ContentJobDetailViewContentProps) {
  if (activeView === 'ideation') {
    return <ContentJobDetailIdeationView pageData={pageData} />;
  }

  if (activeView === 'script') {
    return <ContentJobDetailScriptView pageData={pageData} />;
  }

  if (activeView === 'image') {
    return <ContentJobDetailAssetStageView pageData={pageData} stage="image" />;
  }

  if (activeView === 'voice') {
    return <ContentJobDetailAssetStageView pageData={pageData} stage="voice" />;
  }

  if (activeView === 'video') {
    return <ContentJobDetailAssetStageView pageData={pageData} stage="video" />;
  }

  if (activeView === 'review') {
    return <ContentJobDetailReviewStageView pageData={pageData} />;
  }

  return <ContentJobDetailUploadStageView pageData={pageData} />;
}
