'use client';

import type { JobWorkActionResolution, JobWorkPrimaryAction } from '../../lib/resolve-job-work-action';
import type { AssetStage, JobDetailRouteTabKey } from '../../model';
import type { ContentJobDetailPageData } from '../../model/useContentJobDetailPageData';
import { ContentJobDetailAssetsHubView } from '../assets/content-job-detail-assets-hub-view';
import { ContentJobDetailIdeationTab } from '../tabs/content-job-detail-ideation-tab';
import { ContentJobDetailOverviewView } from '../overview/content-job-detail-overview-view';
import { ContentJobDetailPublishView } from '../publish/content-job-detail-publish-view';
import { ContentJobDetailSceneTab } from '../tabs/content-job-detail-scene-tab';
import { ContentJobDetailTimelineView } from '../timeline/content-job-detail-timeline-view';

type ContentJobDetailViewContentProps = {
  jobId: string;
  activeTab: JobDetailRouteTabKey;
  assetStage: AssetStage;
  pageData: ContentJobDetailPageData;
  workActionResolution: JobWorkActionResolution;
  onWorkAction: (action: JobWorkPrimaryAction) => void;
  sameLineNewJobHref: string;
};

export function ContentJobDetailViewContent({
  jobId,
  activeTab,
  assetStage,
  pageData,
  workActionResolution,
  onWorkAction,
  sameLineNewJobHref,
}: ContentJobDetailViewContentProps) {
  if (activeTab === 'overview') {
    return (
      <ContentJobDetailOverviewView
        jobId={jobId}
        detail={pageData.detail}
        experimentOptions={pageData.detailVm.experimentOptions}
        readyAssetCount={pageData.detailVm.readyAssetCount}
        stylePreset={pageData.detailVm.seedFormInitialValue.stylePreset}
        workActionResolution={workActionResolution}
        onWorkAction={onWorkAction}
        sameLineNewJobHref={sameLineNewJobHref}
      />
    );
  }

  if (activeTab === 'ideation') {
    return <ContentJobDetailIdeationTab jobId={jobId} pageData={pageData} />;
  }

  if (activeTab === 'scene') {
    return <ContentJobDetailSceneTab jobId={jobId} pageData={pageData} />;
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
