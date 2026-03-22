import type { AssetGenerationModality } from '@packages/graphql';
import { useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useContentJobDraft } from '@/entities/content-job';
import type { ContentJobDetailViewModel, JobDraftDetail, SeedForm } from './types';
import { useContentJobDetailMutations } from './useContentJobDetailMutations';
import { createContentJobDetailRefresh } from './useContentJobDetailRefresh';
import { buildContentJobDetailViewModel } from './view-model';

type ContentJobDetailMutations = ReturnType<typeof useContentJobDetailMutations>;

function buildPendingState(mutations: ContentJobDetailMutations) {
  return {
    isRunningAssetGeneration: mutations.runAssetGeneration.isPending,
    isRunningFinalComposition: mutations.runFinalComposition.isPending,
    isRunningSceneJson: mutations.runSceneJson.isPending,
    isRunningTopicPlan: mutations.runTopicPlan.isPending,
    isSavingSceneJson: mutations.updateSceneJson.isPending,
    isSavingTopicSeed: mutations.updateTopicSeed.isPending,
    isApprovingPipelineExecution: mutations.approvePipelineExecution.isPending,
    isUploading: mutations.requestUpload.isPending,
    isEnqueueingToChannelQueue: mutations.enqueueToChannelPublishQueue.isPending,
    isRunningPublishOrchestration: mutations.runPublishOrchestration.isPending,
  };
}

function buildPageHandlers(jobId: string, mutations: ContentJobDetailMutations) {
  return {
    openReviews: () => {
      window.location.href = '/reviews';
    },
    requestUploadError: mutations.requestUpload.error,
    runAssetGeneration: (opts?: { targetSceneId?: number; modality?: AssetGenerationModality }) =>
      mutations.runAssetGeneration.mutate({ jobId, ...opts }),
    runAssetGenerationError: mutations.runAssetGeneration.error,
    runFinalComposition: () => mutations.runFinalComposition.mutate({ jobId }),
    runFinalCompositionError: mutations.runFinalComposition.error,
    runSceneJson: () => mutations.runSceneJson.mutate({ jobId }),
    runSceneJsonError: mutations.runSceneJson.error,
    runTopicPlan: () => mutations.runTopicPlan.mutate({ jobId }),
    runTopicPlanError: mutations.runTopicPlan.error,
    saveSceneJson: (sceneJson: string) => mutations.updateSceneJson.mutate({ jobId, sceneJson }),
    saveTopicSeed: (seedForm: SeedForm) =>
      mutations.updateTopicSeed.mutate({
        jobId,
        contentId: seedForm.contentId,
        targetLanguage: seedForm.targetLanguage,
        titleIdea: seedForm.titleIdea,
        targetDurationSec: Number(seedForm.targetDurationSec),
        stylePreset: seedForm.stylePreset,
        creativeBrief: seedForm.creativeBrief.trim() || undefined,
      }),
    updateSceneJsonError: mutations.updateSceneJson.error,
    updateTopicSeedError: mutations.updateTopicSeed.error,
    approvePipelineExecution: (executionId: string) =>
      mutations.approvePipelineExecution.mutate({ jobId, executionId }),
    approvePipelineExecutionError: mutations.approvePipelineExecution.error,
    upload: () => mutations.requestUpload.mutate({ jobId }),
    enqueueToChannelQueue: (contentId: string) =>
      mutations.enqueueToChannelPublishQueue.mutate({ contentId, jobId }),
    enqueueToChannelQueueError: mutations.enqueueToChannelPublishQueue.error,
    runPublishOrchestration: () => mutations.runPublishOrchestration.mutate({ jobId }),
    runPublishOrchestrationError: mutations.runPublishOrchestration.error,
  };
}

function buildContentJobDetailPageSnapshot(
  jobId: string,
  detail: JobDraftDetail | undefined,
  detailQuery: UseQueryResult<JobDraftDetail | null, Error>,
  detailVm: ContentJobDetailViewModel,
  mutations: ContentJobDetailMutations,
) {
  return {
    detail,
    detailQuery,
    detailVm,
    ...buildPendingState(mutations),
    ...buildPageHandlers(jobId, mutations),
  };
}

export const useContentJobDetailPageData = (jobId: string) => {
  const queryClient = useQueryClient();
  const detailQuery = useContentJobDraft({ jobId }, { enabled: Boolean(jobId) });
  const detail = detailQuery.data ?? undefined;
  const detailVm = useMemo(() => buildContentJobDetailViewModel(detail), [detail]);
  const refresh = createContentJobDetailRefresh(queryClient, jobId);
  const mutations = useContentJobDetailMutations(jobId, refresh);

  return buildContentJobDetailPageSnapshot(jobId, detail, detailQuery, detailVm, mutations);
};

export type ContentJobDetailPageData = ReturnType<typeof useContentJobDetailPageData>;
