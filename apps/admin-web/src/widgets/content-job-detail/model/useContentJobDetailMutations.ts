import { useQueryClient } from '@tanstack/react-query';

import {
  useApproveContentJobPipelineExecution,
  useEnqueueContentJobToChannelQueue,
  useRequestContentJobUpload,
  useRunContentJobAssetGeneration,
  useRunContentJobSceneJson,
  useRunContentJobTopicPlan,
  useUpdateContentJobSceneJson,
  useUpdateContentJobTopicSeed,
} from '@/entities/content-job';

export const useContentJobDetailMutations = (jobId: string, onSuccess: () => Promise<void>) => {
  const queryClient = useQueryClient();
  const invalidateQueue = async (contentId: string) => {
    await queryClient.invalidateQueries({ queryKey: ['channelPublishQueue', contentId] });
  };
  const updateTopicSeed = useUpdateContentJobTopicSeed({ onSuccess });
  const runTopicPlan = useRunContentJobTopicPlan({ onSuccess });
  const runSceneJson = useRunContentJobSceneJson({ onSuccess });
  const updateSceneJson = useUpdateContentJobSceneJson({ onSuccess });
  const runAssetGeneration = useRunContentJobAssetGeneration({ onSuccess });
  const requestUpload = useRequestContentJobUpload({ onSuccess });
  const approvePipelineExecution = useApproveContentJobPipelineExecution({ onSuccess });
  const enqueueToChannelPublishQueue = useEnqueueContentJobToChannelQueue({
    onSuccess: async (_data, variables) => {
      await onSuccess();
      await invalidateQueue(variables.contentId);
    },
  });

  return {
    requestUpload,
    runAssetGeneration,
    runSceneJson,
    runTopicPlan,
    updateSceneJson,
    updateTopicSeed,
    approvePipelineExecution,
    enqueueToChannelPublishQueue,
  };
};
