import { useRequestAssetUploadMutation, useSetJobBackgroundMusicMutation } from '@packages/graphql';
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
  useSelectContentJobSceneImageCandidate,
  useSelectContentJobSceneVoiceCandidate,
  useUpdateContentJobSceneJson,
  useUpdateContentJobTopicSeed,
} from '@/entities/content-job';
import { useSetJobDefaultVoiceProfile, useSetSceneVoiceProfile } from '@/entities/voice-profile';

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

const createQueueInvalidator = (queryClient: ReturnType<typeof useQueryClient>) => {
  return async (contentId: string) => {
    await queryClient.invalidateQueries({ queryKey: ['channelPublishQueue', contentId] });
    await queryClient.invalidateQueries({ queryKey: ['platformConnections', contentId] });
  };
};

const useUploadAndReviewMutations = (onSuccess: () => Promise<void>) => {
  return {
    runFinalComposition: useRunContentJobFinalComposition({ onSuccess }),
    requestAssetUpload: useRequestAssetUploadMutation(),
    setJobBackgroundMusic: useSetJobBackgroundMusicMutation({ onSuccess }),
    requestUpload: useRequestContentJobUpload({ onSuccess }),
    approvePipelineExecution: useApproveContentJobPipelineExecution({ onSuccess }),
  };
};

// eslint-disable-next-line max-lines-per-function
export const useContentJobDetailMutations = (jobId: string, onSuccess: () => Promise<void>) => {
  const queryClient = useQueryClient();
  const invalidateQueue = createQueueInvalidator(queryClient);
  const invalidatePublishDomain = createPublishDomainInvalidator(queryClient, jobId);
  const updateTopicSeed = useUpdateContentJobTopicSeed({ onSuccess }),
    runTopicPlan = useRunContentJobTopicPlan({ onSuccess }),
    runSceneJson = useRunContentJobSceneJson({ onSuccess }),
    updateSceneJson = useUpdateContentJobSceneJson({ onSuccess });
  const runAssetGeneration = useRunContentJobAssetGeneration({ onSuccess }),
    selectSceneImageCandidate = useSelectContentJobSceneImageCandidate({ onSuccess }),
    selectSceneVoiceCandidate = useSelectContentJobSceneVoiceCandidate({ onSuccess }),
    setJobDefaultVoiceProfile = useSetJobDefaultVoiceProfile({ onSuccess }),
    setSceneVoiceProfile = useSetSceneVoiceProfile({ onSuccess });
  const {
    runFinalComposition,
    requestAssetUpload,
    setJobBackgroundMusic,
    requestUpload,
    approvePipelineExecution,
  } = useUploadAndReviewMutations(onSuccess);
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
    selectSceneImageCandidate,
    selectSceneVoiceCandidate,
    setJobDefaultVoiceProfile,
    setSceneVoiceProfile,
    runFinalComposition,
    requestAssetUpload,
    setJobBackgroundMusic,
    runSceneJson,
    runTopicPlan,
    updateSceneJson,
    updateTopicSeed,
    approvePipelineExecution,
    enqueueToChannelPublishQueue,
    runPublishOrchestration,
  };
};
