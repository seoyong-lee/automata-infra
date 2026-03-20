import {
  useRequestContentJobUpload,
  useRunContentJobAssetGeneration,
  useRunContentJobSceneJson,
  useRunContentJobTopicPlan,
  useUpdateContentJobSceneJson,
  useUpdateContentJobTopicSeed,
} from '@/entities/content-job';

export const useContentJobDetailMutations = (onSuccess: () => Promise<void>) => {
  const updateTopicSeed = useUpdateContentJobTopicSeed({ onSuccess });
  const runTopicPlan = useRunContentJobTopicPlan({ onSuccess });
  const runSceneJson = useRunContentJobSceneJson({ onSuccess });
  const updateSceneJson = useUpdateContentJobSceneJson({ onSuccess });
  const runAssetGeneration = useRunContentJobAssetGeneration({ onSuccess });
  const requestUpload = useRequestContentJobUpload({ onSuccess });

  return {
    requestUpload,
    runAssetGeneration,
    runSceneJson,
    runTopicPlan,
    updateSceneJson,
    updateTopicSeed,
  };
};
