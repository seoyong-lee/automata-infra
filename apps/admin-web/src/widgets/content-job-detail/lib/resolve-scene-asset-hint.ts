import type { ModalityAssetStatus } from './resolve-scene-asset-status';

/**
 * 씬 카드 셀에 한 줄로 붙이는 운영 힌트(실패/누락). 상세 에러는 실행 이력 등에서 확인.
 */
export function resolveModalityWorkHint(input: {
  status: ModalityAssetStatus;
  validationStatus?: string | null;
}): string | undefined {
  const { status, validationStatus } = input;
  if (status === 'MISSING') {
    return '출력 없음';
  }
  if (status === 'FAILED') {
    const v = validationStatus?.trim().toUpperCase();
    if (v === 'INVALID') {
      return '검증 실패';
    }
    return '생성 실패';
  }
  return undefined;
}
