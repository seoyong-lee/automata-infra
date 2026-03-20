'use client';

import { getErrorMessage } from '@packages/utils';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import {
  ContentJobDetailContext,
  ContentJobDetailHeader,
  ContentJobDetailViewContent,
  ContentJobDetailViewTabs,
  WorkspaceView,
  useContentJobDetailPageData,
} from '@/widgets/content-job-detail';

export function ContentJobDetailPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params?.jobId ?? '';
  const pageData = useContentJobDetailPageData(jobId);
  const [activeView, setActiveView] = useState<WorkspaceView>('overview');

  return (
    <div className="space-y-6">
      <ContentJobDetailHeader
        contentLineHref={pageData.detailVm.contentLineHref}
        detail={pageData.detail}
        jobId={jobId}
        newJobHref={pageData.detailVm.newJobHref}
        sceneCount={pageData.detailVm.sceneCount}
      />

      {pageData.detailQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading job draft...</p>
      ) : null}
      {pageData.detailQuery.error ? (
        <p className="text-sm text-destructive">{getErrorMessage(pageData.detailQuery.error)}</p>
      ) : null}

      <ContentJobDetailContext detail={pageData.detail} />
      <ContentJobDetailViewTabs activeView={activeView} onChange={setActiveView} />
      <ContentJobDetailViewContent activeView={activeView} pageData={pageData} />
    </div>
  );
}
