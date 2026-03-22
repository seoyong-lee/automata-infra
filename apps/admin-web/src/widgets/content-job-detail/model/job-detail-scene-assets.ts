import {
  resolveModalityAssetStatus,
  resolveSceneOverallStatus,
  resolveSceneStatusLabel,
  type ModalityAssetStatus,
  type SceneOverallStatus,
} from '../lib/resolve-scene-asset-status';
import type { JobDraftDetail } from './types';

export type SceneAssetCard = {
  sceneId: number;
  durationSec?: number;
  narration?: string;
  overallStatus: SceneOverallStatus;
  statusLabel: string;
  image: {
    status: ModalityAssetStatus;
    previewUrl?: string;
    updatedAt?: string;
  };
  voice: {
    status: ModalityAssetStatus;
    previewUrl?: string;
    updatedAt?: string;
  };
  video: {
    status: ModalityAssetStatus;
    previewUrl?: string;
    updatedAt?: string;
  };
};

export function buildSceneAssetCards(detail?: JobDraftDetail): SceneAssetCard[] {
  const scenes = detail?.sceneJson?.scenes ?? [];
  const assets = detail?.assets ?? [];
  const jobIsAssetGenerating = detail?.job.status === 'ASSET_GENERATING';

  return scenes.map((scene) => {
    const row = assets.find((a) => a.sceneId === scene.sceneId);
    const validationStatus = row?.validationStatus;

    const image = resolveModalityAssetStatus({
      hasKey: Boolean(row?.imageS3Key),
      validationStatus,
      jobIsAssetGenerating,
    });
    const voice = resolveModalityAssetStatus({
      hasKey: Boolean(row?.voiceS3Key),
      validationStatus,
      jobIsAssetGenerating,
    });
    const video = resolveModalityAssetStatus({
      hasKey: Boolean(row?.videoClipS3Key),
      validationStatus,
      jobIsAssetGenerating,
    });

    const overallStatus = resolveSceneOverallStatus(image, voice, video);
    const statusLabel = resolveSceneStatusLabel({
      overall: overallStatus,
      image,
      voice,
      video,
    });

    return {
      sceneId: scene.sceneId,
      durationSec: scene.durationSec,
      narration: scene.narration,
      overallStatus,
      statusLabel,
      image: { status: image },
      voice: { status: voice },
      video: { status: video },
    };
  });
}

export function countModalityReady(
  cards: SceneAssetCard[],
  key: 'image' | 'voice' | 'video',
): number {
  return cards.filter((c) => c[key].status === 'READY').length;
}
