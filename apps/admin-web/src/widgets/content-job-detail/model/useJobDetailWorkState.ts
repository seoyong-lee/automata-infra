'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { dispatchJobWorkAction } from '../lib/job-work-action-dispatch';
import { resolveJobWorkAction } from '../lib/resolve-job-work-action';
import type { JobWorkPrimaryAction } from '../lib/resolve-job-work-action';
import type { ContentJobDetailPageData } from './useContentJobDetailPageData';

export function useJobDetailWorkState(jobId: string, pageData: ContentJobDetailPageData) {
  const router = useRouter();
  const workActionResolution = useMemo(
    () =>
      resolveJobWorkAction(
        pageData.detail?.job,
        {
          hasTopicPlan: Boolean(pageData.detail?.job.topicS3Key),
          hasSceneJson: Boolean(pageData.detail?.sceneJson?.scenes?.length),
          sceneCount: pageData.detailVm.sceneCount,
          readyAssetCount: pageData.detailVm.readyAssetCount,
        },
        {
          isRunningTopicPlan: pageData.isRunningTopicPlan,
          isRunningSceneJson: pageData.isRunningSceneJson,
          isRunningAssetGeneration: pageData.isRunningAssetGeneration,
          isRunningFinalComposition: pageData.isRunningFinalComposition,
        },
      ),
    [
      pageData.detail?.job,
      pageData.detail?.sceneJson?.scenes?.length,
      pageData.detailVm.readyAssetCount,
      pageData.detailVm.sceneCount,
      pageData.isRunningAssetGeneration,
      pageData.isRunningFinalComposition,
      pageData.isRunningSceneJson,
      pageData.isRunningTopicPlan,
    ],
  );

  const dispatchWorkAction = useCallback(
    (action: JobWorkPrimaryAction) => {
      dispatchJobWorkAction(action, { jobId, router, pageData });
    },
    [jobId, router, pageData],
  );

  return { workActionResolution, dispatchWorkAction };
}
