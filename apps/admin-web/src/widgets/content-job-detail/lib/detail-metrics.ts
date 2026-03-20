import type { JobDraftDetail } from '../model/types';

export const getSceneCount = (detail?: JobDraftDetail) => {
  return detail?.sceneJson?.scenes.length ?? detail?.assets.length ?? 0;
};

export const getReadyAssetCount = (detail?: JobDraftDetail) => {
  return (
    detail?.assets.filter((asset) => asset.imageS3Key || asset.videoClipS3Key || asset.voiceS3Key)
      .length ?? 0
  );
};

export const buildExperimentScore = (input: {
  status?: string;
  sceneCount: number;
  assetReadyCount: number;
  autoPublish?: boolean | null;
}) => {
  const base =
    input.status === 'UPLOADED'
      ? 92
      : input.status === 'RENDERED'
        ? 80
        : input.status === 'ASSETS_READY'
          ? 72
          : input.status === 'SCENE_JSON_READY'
            ? 61
            : 45;
  const coverageBonus = input.sceneCount > 0 ? Math.min(6, input.assetReadyCount * 2) : 0;
  return base + coverageBonus + (input.autoPublish ? 3 : 0);
};
