'use client';

import type { AssetsViewMode } from '../../lib/detail-workspace-tabs';
import type {
  JobWorkActionResolution,
  JobWorkPrimaryAction,
} from '../../lib/resolve-job-work-action';
import type { AssetStage, JobDetailRouteTabKey } from '../../model';
import type { ContentJobDetailPageData } from '../../model/useContentJobDetailPageData';
import { ContentJobDetailAssetsHubView } from '../assets';
import { ContentJobDetailOverviewView } from '../overview';
import { ContentJobDetailPublishView } from '../publish';
import { contentJobDetailTabs } from '../tabs';
import { ContentJobDetailTimelineView } from '../timeline';

type ContentJobDetailViewContentProps = {
  jobId: string;
  activeTab: JobDetailRouteTabKey;
  assetStage: AssetStage;
  assetsViewMode: AssetsViewMode;
  pageData: ContentJobDetailPageData;
  workActionResolution: JobWorkActionResolution;
  onWorkAction: (action: JobWorkPrimaryAction) => void;
};

export function ContentJobDetailViewContent({
  jobId,
  activeTab,
  assetStage,
  assetsViewMode,
  pageData,
  workActionResolution,
  onWorkAction,
}: ContentJobDetailViewContentProps) {
  const { ContentJobDetailIdeationTab, ContentJobDetailSceneTab } = contentJobDetailTabs;

  if (activeTab === 'overview') {
    return (
      <ContentJobDetailOverviewView
        jobId={jobId}
        detail={pageData.detail}
        readyAssetCount={pageData.detailVm.readyAssetCount}
        workActionResolution={workActionResolution}
        onWorkAction={onWorkAction}
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
      <ContentJobDetailAssetsHubView
        jobId={jobId}
        assetStage={assetStage}
        assetsViewMode={assetsViewMode}
        pageData={pageData}
      />
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
