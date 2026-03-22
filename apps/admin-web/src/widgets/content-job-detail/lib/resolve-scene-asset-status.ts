export type ModalityAssetStatus = 'READY' | 'MISSING' | 'FAILED' | 'PENDING';

export type SceneOverallStatus = 'READY' | 'PARTIAL' | 'FAILED' | 'PENDING';

const norm = (s?: string | null) => s?.trim().toUpperCase() ?? '';

export function resolveModalityAssetStatus(input: {
  hasKey: boolean;
  validationStatus?: string | null;
  jobIsAssetGenerating: boolean;
}): ModalityAssetStatus {
  const v = norm(input.validationStatus);
  if (v === 'INVALID') {
    return input.hasKey ? 'FAILED' : 'MISSING';
  }
  if (input.hasKey) {
    return 'READY';
  }
  if (input.jobIsAssetGenerating) {
    return 'PENDING';
  }
  return 'MISSING';
}

export function resolveSceneOverallStatus(
  image: ModalityAssetStatus,
  voice: ModalityAssetStatus,
  video: ModalityAssetStatus,
): SceneOverallStatus {
  const modalities = [image, voice, video];
  if (modalities.some((m) => m === 'FAILED')) {
    return 'FAILED';
  }
  if (modalities.some((m) => m === 'PENDING')) {
    return 'PENDING';
  }
  if (modalities.every((m) => m === 'READY')) {
    return 'READY';
  }
  return 'PARTIAL';
}

export function resolveSceneStatusLabel(input: {
  overall: SceneOverallStatus;
  image: ModalityAssetStatus;
  voice: ModalityAssetStatus;
  video: ModalityAssetStatus;
}): string {
  if (input.overall === 'READY') {
    return '준비됨';
  }
  if (input.overall === 'PENDING') {
    return '생성 중';
  }
  if (input.overall === 'FAILED') {
    if (input.image === 'FAILED') {
      return '이미지 실패';
    }
    if (input.voice === 'FAILED') {
      return '음성 실패';
    }
    if (input.video === 'FAILED') {
      return '영상 실패';
    }
    return '실패';
  }
  const missing: string[] = [];
  if (input.image !== 'READY') {
    missing.push('이미지');
  }
  if (input.voice !== 'READY') {
    missing.push('음성');
  }
  if (input.video !== 'READY') {
    missing.push('영상');
  }
  if (missing.length) {
    return `${missing.join('·')} 누락`;
  }
  return '일부 누락';
}

export function modalityStatusLabel(status: ModalityAssetStatus): string {
  switch (status) {
    case 'READY':
      return '준비됨';
    case 'MISSING':
      return '없음';
    case 'PENDING':
      return '생성 중';
    case 'FAILED':
      return '실패';
    default:
      return status;
  }
}
