/** JobStatus → 대략적 파이프라인 위치 (UI 진행 표시용, 비즈니스 단일 진실 아님). */
export const PIPELINE_STAGE_LABELS = [
  '아이데이션',
  '씬 설계',
  '에셋',
  '렌더·검수',
  '출고·발행',
] as const;

export function getPipelineStageIndex(status: string): number {
  const groups: string[][] = [
    ['DRAFT', 'PLANNING', 'PLANNED'],
    ['SCENE_JSON_BUILDING', 'SCENE_JSON_READY'],
    ['ASSET_GENERATING', 'ASSETS_READY', 'VALIDATING'],
    [
      'RENDER_PLAN_READY',
      'RENDERED',
      'REVIEW_PENDING',
      'APPROVED',
      'REJECTED',
      'READY_TO_SCHEDULE',
    ],
    ['UPLOAD_QUEUED', 'UPLOADED', 'METRICS_COLLECTED'],
  ];
  for (let i = 0; i < groups.length; i++) {
    if (groups[i].includes(status)) {
      return i;
    }
  }
  if (status === 'FAILED') {
    return 2;
  }
  return 0;
}
