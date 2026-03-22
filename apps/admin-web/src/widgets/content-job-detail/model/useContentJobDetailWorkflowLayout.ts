'use client';

import { useMemo } from 'react';

import {
  buildContentJobReadinessChips,
  buildContentJobWorkflowNav,
} from '../lib/content-job-workflow';
import type { JobDetailRouteTabKey } from '../lib/detail-workspace-tabs';
import type { ContentJobDetailPageData } from './useContentJobDetailPageData';
import { useContentJobPublishHash } from './useContentJobPublishHash';

export function useContentJobDetailWorkflowLayout(
  jobId: string,
  activeTab: JobDetailRouteTabKey,
  pageData: ContentJobDetailPageData,
) {
  const publishHash = useContentJobPublishHash(activeTab);
  const workflowStages = useMemo(
    () =>
      buildContentJobWorkflowNav({
        jobId,
        job: pageData.detail?.job,
        activeTab,
        publishHash,
        hasScenePayload: Boolean(pageData.detail?.sceneJson?.scenes?.length),
        sceneCount: pageData.detailVm.sceneCount,
        readyAssetCount: pageData.detailVm.readyAssetCount,
      }),
    [
      jobId,
      pageData.detail?.job,
      pageData.detail?.sceneJson?.scenes?.length,
      activeTab,
      publishHash,
      pageData.detailVm.sceneCount,
      pageData.detailVm.readyAssetCount,
    ],
  );
  const readinessChips = useMemo(
    () =>
      buildContentJobReadinessChips({
        jobId,
        job: pageData.detail?.job,
      }),
    [jobId, pageData.detail?.job],
  );
  return { workflowStages, readinessChips };
}
