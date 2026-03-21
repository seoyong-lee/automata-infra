import {
  useApprovePipelineExecutionMutation,
  useJobDraftQuery,
  useRequestUploadMutation,
  useRunAssetGenerationMutation,
  useRunSceneJsonMutation,
  useRunTopicPlanMutation,
  useUpdateSceneJsonMutation,
  useUpdateTopicSeedMutation,
} from '@packages/graphql';

export type { SeedForm } from './seed-form';

export type ContentJobDraftDetail = NonNullable<ReturnType<typeof useJobDraftQuery>['data']>;

export const useContentJobDraft = useJobDraftQuery;
export const useRequestContentJobUpload = useRequestUploadMutation;
export const useRunContentJobAssetGeneration = useRunAssetGenerationMutation;
export const useRunContentJobSceneJson = useRunSceneJsonMutation;
export const useRunContentJobTopicPlan = useRunTopicPlanMutation;
export const useUpdateContentJobSceneJson = useUpdateSceneJsonMutation;
export const useUpdateContentJobTopicSeed = useUpdateTopicSeedMutation;
export const useApproveContentJobPipelineExecution = useApprovePipelineExecutionMutation;
