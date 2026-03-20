import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useContentJobDraft } from '@/entities/content-job';
import type { SeedForm } from './types';
import { useContentJobDetailMutations } from './useContentJobDetailMutations';
import { createContentJobDetailRefresh } from './useContentJobDetailRefresh';
import { buildContentJobDetailViewModel } from './view-model';

export const useContentJobDetailPageData = (jobId: string) => {
  const queryClient = useQueryClient();
  const detailQuery = useContentJobDraft({ jobId }, { enabled: Boolean(jobId) });
  const detail = detailQuery.data ?? undefined;
  const detailVm = useMemo(() => buildContentJobDetailViewModel(detail), [detail]);
  const refresh = createContentJobDetailRefresh(queryClient, jobId);
  const mutations = useContentJobDetailMutations(refresh);

  return {
    detail,
    detailQuery,
    detailVm,
    isRunningAssetGeneration: mutations.runAssetGeneration.isPending,
    isRunningSceneJson: mutations.runSceneJson.isPending,
    isRunningTopicPlan: mutations.runTopicPlan.isPending,
    isSavingSceneJson: mutations.updateSceneJson.isPending,
    isSavingTopicSeed: mutations.updateTopicSeed.isPending,
    isUploading: mutations.requestUpload.isPending,
    openReviews: () => {
      window.location.href = '/reviews';
    },
    requestUploadError: mutations.requestUpload.error,
    runAssetGeneration: () => mutations.runAssetGeneration.mutate({ jobId }),
    runAssetGenerationError: mutations.runAssetGeneration.error,
    runSceneJson: () => mutations.runSceneJson.mutate({ jobId }),
    runSceneJsonError: mutations.runSceneJson.error,
    runTopicPlan: () => mutations.runTopicPlan.mutate({ jobId }),
    runTopicPlanError: mutations.runTopicPlan.error,
    saveSceneJson: (sceneJson: string) => mutations.updateSceneJson.mutate({ jobId, sceneJson }),
    saveTopicSeed: (seedForm: SeedForm) =>
      mutations.updateTopicSeed.mutate({
        jobId,
        channelId: seedForm.channelId,
        targetLanguage: seedForm.targetLanguage,
        titleIdea: seedForm.titleIdea,
        targetDurationSec: Number(seedForm.targetDurationSec),
        stylePreset: seedForm.stylePreset,
      }),
    updateSceneJsonError: mutations.updateSceneJson.error,
    updateTopicSeedError: mutations.updateTopicSeed.error,
    upload: () => mutations.requestUpload.mutate({ jobId }),
  };
};

export type ContentJobDetailPageData = ReturnType<typeof useContentJobDetailPageData>;
