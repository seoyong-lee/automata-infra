import {
  useApprovePipelineExecutionMutation,
  useContentPublishDraftQuery,
  useEnqueueToChannelPublishQueueMutation,
  useJobDraftQuery,
  usePublishTargetsForJobQuery,
  useRequestAssetUploadMutation,
  useRequestUploadMutation,
  useRunAssetGenerationMutation,
  useRunFinalCompositionMutation,
  useRunPublishOrchestrationMutation,
  useRunSceneJsonMutation,
  useSetJobBackgroundMusicMutation,
  useSelectSceneImageCandidateMutation,
  useSelectSceneVoiceCandidateMutation,
  useRunTopicPlanMutation,
  useUpdateSceneJsonMutation,
  useUpdateTopicSeedMutation,
} from '@packages/graphql';

export type { SeedForm } from './seed-form';

export type ContentJobDraftDetail = NonNullable<ReturnType<typeof useJobDraftQuery>['data']>;

export const useContentJobDraft = useJobDraftQuery;
export const useRequestContentJobUpload = useRequestUploadMutation;
export const useRequestContentJobAssetUpload = useRequestAssetUploadMutation;
export const useRunContentJobAssetGeneration = useRunAssetGenerationMutation;
export const useRunContentJobFinalComposition = useRunFinalCompositionMutation;
export const useRunContentJobSceneJson = useRunSceneJsonMutation;
export const useSetContentJobBackgroundMusic = useSetJobBackgroundMusicMutation;
export const useSelectContentJobSceneImageCandidate = useSelectSceneImageCandidateMutation;
export const useSelectContentJobSceneVoiceCandidate = useSelectSceneVoiceCandidateMutation;
export const useRunContentJobTopicPlan = useRunTopicPlanMutation;
export const useUpdateContentJobSceneJson = useUpdateSceneJsonMutation;
export const useUpdateContentJobTopicSeed = useUpdateTopicSeedMutation;
export const useApproveContentJobPipelineExecution = useApprovePipelineExecutionMutation;
export const useEnqueueContentJobToChannelQueue = useEnqueueToChannelPublishQueueMutation;
export const useRunContentJobPublishOrchestration = useRunPublishOrchestrationMutation;
export const useContentJobPublishTargets = usePublishTargetsForJobQuery;
export const useContentJobPublishDraft = useContentPublishDraftQuery;
