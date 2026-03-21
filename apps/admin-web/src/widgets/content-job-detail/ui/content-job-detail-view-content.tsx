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
        detail={pageData.detail}
        experimentOptions={detailVm.experimentOptions}
        readyAssetCount={detailVm.readyAssetCount}
        stylePreset={detailVm.seedFormInitialValue.stylePreset}
      />
    );
  }

  if (activeTab === 'ideation') {
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

  if (activeTab === 'scene') {
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

  if (activeTab === 'assets') {
    return (
      <ContentJobDetailAssetsHubView jobId={jobId} assetStage={assetStage} pageData={pageData} />
    );
  }

  if (activeTab === 'publish') {
    return <ContentJobDetailPublishView pageData={pageData} />;
  }

  if (activeTab === 'timeline') {
    return <ContentJobDetailTimelineView jobId={jobId} />;
  }

  return null;
}
