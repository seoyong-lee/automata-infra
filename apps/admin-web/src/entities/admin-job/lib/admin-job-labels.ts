import type { AdminJob } from '../model';

/** 파이프라인 상위 구간 — 목록에서 “어디쯤인지” 빠르게 보기 위함. */
// eslint-disable-next-line complexity
export function getJobPhaseLabelKo(status: AdminJob['status']): string {
  switch (status) {
    case 'DRAFT':
    case 'PLANNING':
    case 'PLANNED':
      return '기획';
    case 'SCENE_JSON_BUILDING':
    case 'SCENE_JSON_READY':
      return '씬';
    case 'ASSET_GENERATING':
    case 'ASSETS_READY':
    case 'VALIDATING':
      return '에셋';
    case 'RENDER_PLAN_READY':
    case 'RENDERED':
      return '렌더';
    case 'REVIEW_PENDING':
    case 'APPROVED':
    case 'REJECTED':
      return '검수';
    case 'READY_TO_SCHEDULE':
    case 'UPLOAD_QUEUED':
    case 'UPLOADED':
      return '출고';
    case 'FAILED':
      return '실패';
    case 'METRICS_COLLECTED':
      return '완료';
    default:
      return '—';
  }
}

const STATUS_LABEL_KO: Record<AdminJob['status'], string> = {
  DRAFT: '초안',
  PLANNING: '토픽 계획 중',
  PLANNED: '토픽 완료',
  SCENE_JSON_BUILDING: '씬 JSON 생성 중',
  SCENE_JSON_READY: '씬 설계 완료',
  ASSET_GENERATING: '에셋 생성 중',
  ASSETS_READY: '에셋 준비됨',
  VALIDATING: '검증 중',
  RENDER_PLAN_READY: '렌더 준비',
  RENDERED: '렌더 완료',
  REVIEW_PENDING: '검수 대기',
  APPROVED: '승인됨',
  REJECTED: '반려',
  READY_TO_SCHEDULE: '업로드 예약 전',
  UPLOAD_QUEUED: '업로드 대기',
  UPLOADED: '업로드됨',
  FAILED: '실패',
  METRICS_COLLECTED: '지표 수집',
};

export function getJobStatusLabelKo(status: AdminJob['status']): string {
  return STATUS_LABEL_KO[status] ?? status;
}

/** 운영자가 바로 볼 “다음 조치” 힌트. */
// eslint-disable-next-line complexity
export function getJobActionNeededLabel(job: AdminJob): string {
  const { status, reviewAction } = job;
  if (status === 'FAILED') return '실패·원인 확인';
  if (status === 'REVIEW_PENDING') {
    if (reviewAction === 'REGENERATE') return '재생성 검토';
    return '검수';
  }
  if (status === 'REJECTED') return '반려·수정';
  if (status === 'READY_TO_SCHEDULE' || status === 'UPLOAD_QUEUED') return '업로드';
  if (
    status === 'DRAFT' ||
    status === 'PLANNING' ||
    status === 'PLANNED' ||
    status === 'SCENE_JSON_BUILDING' ||
    status === 'ASSET_GENERATING' ||
    status === 'VALIDATING'
  ) {
    return '파이프라인 진행';
  }
  if (status === 'UPLOADED' || status === 'METRICS_COLLECTED' || status === 'APPROVED') {
    return '—';
  }
  return '—';
}

/** Badge는 destructive variant가 없어 className으로 강조한다. */
export function getJobStatusBadgeProps(status: AdminJob['status']): {
  variant: 'default' | 'secondary' | 'outline';
  className?: string;
} {
  if (status === 'FAILED' || status === 'REJECTED') {
    return {
      variant: 'outline',
      className: 'border-transparent bg-destructive text-destructive-foreground',
    };
  }
  if (status === 'REVIEW_PENDING') return { variant: 'default' };
  if (status === 'UPLOADED' || status === 'METRICS_COLLECTED' || status === 'APPROVED') {
    return { variant: 'secondary' };
  }
  return { variant: 'outline' };
}
