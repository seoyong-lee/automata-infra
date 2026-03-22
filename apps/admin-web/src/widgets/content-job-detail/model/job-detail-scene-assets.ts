import { buildAssetPreviewUrlFromS3Key } from '../lib/build-asset-preview-url';
import { resolveModalityWorkHint } from '../lib/resolve-scene-asset-hint';
import {
  resolveModalityAssetStatus,
  resolveSceneOverallStatus,
  resolveSceneStatusLabel,
  type ModalityAssetStatus,
  type SceneOverallStatus,
} from '../lib/resolve-scene-asset-status';
import type { JobDraftDetail } from './types';

export type SceneAssetModalitySlice = {
  status: ModalityAssetStatus;
  previewUrl?: string;
  /** S3 키는 있는데 CDN 도메인 미설정 등으로 URL을 못 만든 경우 */
  cdnBlocked?: boolean;
  workHint?: string;
};

export type SceneImageCandidateCard = {
  candidateId: string;
  previewUrl?: string;
  cdnBlocked?: boolean;
  provider?: string | null;
  createdAt: string;
  selected: boolean;
};

export type SceneAssetCard = {
  sceneId: number;
  durationSec?: number;
  narration?: string;
  voiceProfileId?: string | null;
  overallStatus: SceneOverallStatus;
  statusLabel: string;
  image: SceneAssetModalitySlice;
  imageCandidates: SceneImageCandidateCard[];
  voice: SceneAssetModalitySlice;
  video: SceneAssetModalitySlice;
};

type SceneDraftRow = NonNullable<JobDraftDetail['sceneJson']>['scenes'][number];
type AssetDraftRow = JobDraftDetail['assets'][number];

const buildModalitySlice = (
  s3Key: string | null | undefined,
  status: ModalityAssetStatus,
  validationStatus: string | null | undefined,
): SceneAssetModalitySlice => {
  const previewUrl = buildAssetPreviewUrlFromS3Key(s3Key);
  return {
    status,
    previewUrl,
    cdnBlocked: Boolean(s3Key) && !previewUrl,
    workHint: resolveModalityWorkHint({ status, validationStatus }),
  };
};

const buildSceneAssetCardFromScene = (
  scene: SceneDraftRow,
  row: AssetDraftRow | undefined,
  jobIsAssetGenerating: boolean,
): SceneAssetCard => {
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
    voiceProfileId: row?.voiceProfileId,
    overallStatus,
    statusLabel,
    image: buildModalitySlice(row?.imageS3Key, image, validationStatus),
    imageCandidates: (row?.imageCandidates ?? []).map((candidate) => ({
      candidateId: candidate.candidateId,
      previewUrl: buildAssetPreviewUrlFromS3Key(candidate.imageS3Key),
      cdnBlocked:
        Boolean(candidate.imageS3Key) && !buildAssetPreviewUrlFromS3Key(candidate.imageS3Key),
      provider: candidate.provider,
      createdAt: candidate.createdAt,
      selected: candidate.selected,
    })),
    voice: buildModalitySlice(row?.voiceS3Key, voice, validationStatus),
    video: buildModalitySlice(row?.videoClipS3Key, video, validationStatus),
  };
};

export function buildSceneAssetCards(detail?: JobDraftDetail): SceneAssetCard[] {
  const scenes = detail?.sceneJson?.scenes ?? [];
  const assets = detail?.assets ?? [];
  const jobIsAssetGenerating = detail?.job.status === 'ASSET_GENERATING';

  return scenes.map((scene) => {
    const row = assets.find((a) => a.sceneId === scene.sceneId);
    return buildSceneAssetCardFromScene(scene, row, jobIsAssetGenerating);
  });
}

export function countModalityReady(
  cards: SceneAssetCard[],
  key: 'image' | 'voice' | 'video',
): number {
  return cards.filter((c) => c[key].status === 'READY').length;
}
