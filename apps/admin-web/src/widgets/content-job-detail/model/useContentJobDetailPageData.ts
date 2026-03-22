import type {
  AssetGenerationModality,
  ImageGenerationProvider,
  PipelineExecution,
} from '@packages/graphql';
import { useJobExecutionsQuery } from '@packages/graphql';
import { useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useContentJobDraft } from '@/entities/content-job';
import type { ContentJobDetailViewModel, JobDraftDetail, SeedForm } from './types';
import { useContentJobDetailMutations } from './useContentJobDetailMutations';
import { createContentJobDetailRefresh } from './useContentJobDetailRefresh';
import { buildContentJobDetailViewModel } from './view-model';

type ContentJobDetailMutations = ReturnType<typeof useContentJobDetailMutations>;

const DETAIL_POLL_ACTIVE_STATUSES = new Set([
  'PLANNING',
  'SCENE_JSON_BUILDING',
  'ASSET_GENERATING',
  'VALIDATING',
]);

const ACTIVE_EXECUTION_STATUSES = new Set(['QUEUED', 'RUNNING']);

function shouldPollDetail(detail: JobDraftDetail | null | undefined) {
  const status = detail?.job.status;
  return typeof status === 'string' && DETAIL_POLL_ACTIVE_STATUSES.has(status);
}

function hasActiveStageExecution(
  executions: PipelineExecution[] | undefined,
  stageType: PipelineExecution['stageType'],
) {
  return (
    executions?.some(
      (execution) =>
        execution.stageType === stageType && ACTIVE_EXECUTION_STATUSES.has(execution.status),
    ) ?? false
  );
}

function hasAnyActiveStageExecution(
  executions: PipelineExecution[] | undefined,
  stageTypes: PipelineExecution['stageType'][],
) {
  return stageTypes.some((stageType) => hasActiveStageExecution(executions, stageType));
}

function buildPendingState(
  mutations: ContentJobDetailMutations,
  detail: JobDraftDetail | undefined,
  executions: PipelineExecution[] | undefined,
) {
  const status = detail?.job.status;
  const assetExecutionRunning = hasActiveStageExecution(executions, 'ASSET_GENERATION');
  const finalCompositionRunning = hasActiveStageExecution(executions, 'FINAL_COMPOSITION');
  return {
    isSubmittingAssetGeneration: mutations.runAssetGeneration.isPending,
    isRunningAssetGeneration: mutations.runAssetGeneration.isPending || assetExecutionRunning,
    isRunningFinalComposition: mutations.runFinalComposition.isPending || finalCompositionRunning,
    isRunningSceneJson: mutations.runSceneJson.isPending || status === 'SCENE_JSON_BUILDING',
    isRunningTopicPlan: mutations.runTopicPlan.isPending || status === 'PLANNING',
    isSavingSceneJson: mutations.updateSceneJson.isPending,
    isSelectingSceneImageCandidate: mutations.selectSceneImageCandidate.isPending,
    isSavingTopicSeed: mutations.updateTopicSeed.isPending,
    isApprovingPipelineExecution: mutations.approvePipelineExecution.isPending,
    isUploading: mutations.requestUpload.isPending,
    isEnqueueingToChannelQueue: mutations.enqueueToChannelPublishQueue.isPending,
    isRunningPublishOrchestration: mutations.runPublishOrchestration.isPending,
  };
}

function buildPageHandlers(jobId: string, mutations: ContentJobDetailMutations) {
  return {
    openReviews: () => { window.location.href = '/reviews'; },
    requestUploadError: mutations.requestUpload.error,
    runAssetGeneration: (opts?: {
      targetSceneId?: number;
      modality?: AssetGenerationModality;
      imageProvider?: ImageGenerationProvider;
    }) => mutations.runAssetGeneration.mutate({ jobId, ...opts }),
    selectSceneImageCandidate: (sceneId: number, candidateId: string) =>
      mutations.selectSceneImageCandidate.mutate({ jobId, sceneId, candidateId }),
    runAssetGenerationError: mutations.runAssetGeneration.error,
    selectSceneImageCandidateError: mutations.selectSceneImageCandidate.error,
    runFinalComposition: (opts?: { burnInSubtitles?: boolean }) => mutations.runFinalComposition.mutate({ jobId, ...opts }),
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
  executions: PipelineExecution[] | undefined,
) {
  return {
    detail,
    detailQuery,
    detailVm,
    ...buildPendingState(mutations, detail, executions),
    ...buildPageHandlers(jobId, mutations),
  };
}

export const useContentJobDetailPageData = (jobId: string) => {
  const queryClient = useQueryClient();
  const executionsQuery = useJobExecutionsQuery(
    { jobId },
    {
      enabled: Boolean(jobId),
      refetchInterval: (query) =>
        hasAnyActiveStageExecution(
          (query.state.data as PipelineExecution[] | undefined) ?? undefined,
          ['ASSET_GENERATION', 'FINAL_COMPOSITION'],
        )
          ? 3000
          : false,
      refetchIntervalInBackground: true,
    },
  );
  const detailQuery = useContentJobDraft(
    { jobId },
    {
      enabled: Boolean(jobId),
      refetchInterval: (query) =>
        shouldPollDetail((query.state.data as JobDraftDetail | null | undefined) ?? undefined) ||
        hasActiveStageExecution(executionsQuery.data ?? undefined, 'FINAL_COMPOSITION')
          ? 3000
          : false,
      refetchIntervalInBackground: true,
    },
  );
  const detail = detailQuery.data ?? undefined;
  const executions = executionsQuery.data ?? undefined;
  const detailVm = useMemo(() => buildContentJobDetailViewModel(detail), [detail]);
  const refresh = createContentJobDetailRefresh(queryClient, jobId);
  const mutations = useContentJobDetailMutations(jobId, refresh);

  return buildContentJobDetailPageSnapshot(
    jobId,
    detail,
    detailQuery,
    detailVm,
    mutations,
    executions,
  );
};

export type ContentJobDetailPageData = ReturnType<typeof useContentJobDetailPageData>;
