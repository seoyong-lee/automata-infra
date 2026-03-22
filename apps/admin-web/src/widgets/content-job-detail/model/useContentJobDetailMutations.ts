import { useQueryClient } from '@tanstack/react-query';

import {
  useApproveContentJobPipelineExecution,
  useEnqueueContentJobToChannelQueue,
  useRunContentJobFinalComposition,
  useRequestContentJobUpload,
  useRunContentJobAssetGeneration,
  useRunContentJobPublishOrchestration,
  useRunContentJobSceneJson,
  useRunContentJobTopicPlan,
  useUpdateContentJobSceneJson,
  useUpdateContentJobTopicSeed,
} from '@/entities/content-job';

const createPublishDomainInvalidator = (
  queryClient: ReturnType<typeof useQueryClient>,
  jobId: string,
) => {
  return async () => {
    await queryClient.invalidateQueries({ queryKey: ['jobDraft', jobId] });
    await queryClient.invalidateQueries({ queryKey: ['publishTargetsForJob', jobId] });
    await queryClient.invalidateQueries({ queryKey: ['contentPublishDraft', jobId] });
    await queryClient.invalidateQueries({ queryKey: ['channelPublishQueue'] });
    await queryClient.invalidateQueries({ queryKey: ['platformConnections'] });
  };
};

export const useContentJobDetailMutations = (jobId: string, onSuccess: () => Promise<void>) => {
  const queryClient = useQueryClient();
  const invalidateQueue = async (contentId: string) => {
    await queryClient.invalidateQueries({ queryKey: ['channelPublishQueue', contentId] });
    await queryClient.invalidateQueries({ queryKey: ['platformConnections', contentId] });
  };
  const invalidatePublishDomain = createPublishDomainInvalidator(queryClient, jobId);
  const updateTopicSeed = useUpdateContentJobTopicSeed({ onSuccess });
  const runTopicPlan = useRunContentJobTopicPlan({ onSuccess });
  const runSceneJson = useRunContentJobSceneJson({ onSuccess });
  const updateSceneJson = useUpdateContentJobSceneJson({ onSuccess });
  const runAssetGeneration = useRunContentJobAssetGeneration({ onSuccess });
  const runFinalComposition = useRunContentJobFinalComposition({ onSuccess });
  const requestUpload = useRequestContentJobUpload({ onSuccess });
  const approvePipelineExecution = useApproveContentJobPipelineExecution({ onSuccess });
  const enqueueToChannelPublishQueue = useEnqueueContentJobToChannelQueue({
    onSuccess: async (_data, variables) => {
      await onSuccess();
      await invalidateQueue(variables.contentId);
    },
  });
  const runPublishOrchestration = useRunContentJobPublishOrchestration({
    onSuccess: async () => {
      await onSuccess();
      await invalidatePublishDomain();
    },
  });

  return {
    requestUpload,
    runAssetGeneration,
    runFinalComposition,
    runSceneJson,
    runTopicPlan,
    updateSceneJson,
    updateTopicSeed,
    approvePipelineExecution,
    enqueueToChannelPublishQueue,
    runPublishOrchestration,
  };
};
