'use client';

import { useMemo } from 'react';

import {
  buildContentJobReadinessChips,
  buildContentJobWorkflowNav,
  getCurrentWorkflowStage,
  getNextWorkflowStage,
  getWorkflowStageMeta,
} from '../lib/content-job-workflow';
import type { WorkflowNavItem, WorkflowStageMeta } from '../lib/content-job-workflow';
import type { JobDetailRouteTabKey } from '../lib/detail-workspace-tabs';
import type { ContentJobDetailPageData } from './useContentJobDetailPageData';
import { useContentJobPublishHash } from './useContentJobPublishHash';

function stageMeta(stage: WorkflowNavItem | null): WorkflowStageMeta | null {
  return stage ? getWorkflowStageMeta(stage.key) : null;
}

export function useContentJobDetailWorkflowLayout(
  jobId: string,
  activeTab: JobDetailRouteTabKey,
  pageData: ContentJobDetailPageData,
) {
  const publishHash = useContentJobPublishHash(activeTab);
  const job = pageData.detail?.job;
  const hasScenePayload = Boolean(pageData.detail?.sceneJson?.scenes?.length);
  const sceneCount = pageData.detailVm.sceneCount;
  const readyAssetCount = pageData.detailVm.readyAssetCount;
  const workflowStages = useMemo(
    () =>
      buildContentJobWorkflowNav({
        jobId,
        job,
        activeTab,
        publishHash,
        hasScenePayload,
        sceneCount,
        readyAssetCount,
      }),
    [activeTab, hasScenePayload, job, jobId, publishHash, readyAssetCount, sceneCount],
  );
  const readinessChips = useMemo(() => buildContentJobReadinessChips({ jobId, job }), [job, jobId]);
  const currentStage = useMemo(() => getCurrentWorkflowStage(workflowStages), [workflowStages]);
  const nextStage = useMemo(
    () => getNextWorkflowStage(workflowStages, currentStage?.key),
    [currentStage?.key, workflowStages],
  );
  return {
    workflowStages,
    readinessChips,
    currentStage,
    currentStageMeta: stageMeta(currentStage),
    nextStage,
    nextStageMeta: stageMeta(nextStage),
  };
}
