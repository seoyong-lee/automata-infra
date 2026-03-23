import type { AdminJob } from '../model';

type AdminJobLocale = 'ko' | 'en';

const PHASE_LABELS: Record<AdminJobLocale, Record<string, string>> = {
  ko: {
    planning: '기획',
    scene: '씬',
    assets: '에셋',
    render: '렌더',
    review: '검수',
    delivery: '출고',
    failed: '실패',
    done: '완료',
    unknown: '—',
  },
  en: {
    planning: 'Planning',
    scene: 'Scene',
    assets: 'Assets',
    render: 'Render',
    review: 'Review',
    delivery: 'Delivery',
    failed: 'Failed',
    done: 'Done',
    unknown: '—',
  },
};

const STATUS_LABELS: Record<AdminJobLocale, Record<AdminJob['status'], string>> = {
  ko: {
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
  },
  en: {
    DRAFT: 'Draft',
    PLANNING: 'Planning Topic',
    PLANNED: 'Topic Planned',
    SCENE_JSON_BUILDING: 'Building Scene JSON',
    SCENE_JSON_READY: 'Scene Ready',
    ASSET_GENERATING: 'Generating Assets',
    ASSETS_READY: 'Assets Ready',
    VALIDATING: 'Validating',
    RENDER_PLAN_READY: 'Render Ready',
    RENDERED: 'Rendered',
    REVIEW_PENDING: 'Review Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    READY_TO_SCHEDULE: 'Before Scheduling Upload',
    UPLOAD_QUEUED: 'Upload Queued',
    UPLOADED: 'Uploaded',
    FAILED: 'Failed',
    METRICS_COLLECTED: 'Metrics Collected',
  },
};

/** 파이프라인 상위 구간 — 목록에서 “어디쯤인지” 빠르게 보기 위함. */
// eslint-disable-next-line complexity
export function getJobPhaseLabel(status: AdminJob['status'], locale: AdminJobLocale = 'ko'): string {
  const labels = PHASE_LABELS[locale];

  switch (status) {
    case 'DRAFT':
    case 'PLANNING':
    case 'PLANNED':
      return labels.planning;
    case 'SCENE_JSON_BUILDING':
    case 'SCENE_JSON_READY':
      return labels.scene;
    case 'ASSET_GENERATING':
    case 'ASSETS_READY':
    case 'VALIDATING':
      return labels.assets;
    case 'RENDER_PLAN_READY':
    case 'RENDERED':
      return labels.render;
    case 'REVIEW_PENDING':
    case 'APPROVED':
    case 'REJECTED':
      return labels.review;
    case 'READY_TO_SCHEDULE':
    case 'UPLOAD_QUEUED':
    case 'UPLOADED':
      return labels.delivery;
    case 'FAILED':
      return labels.failed;
    case 'METRICS_COLLECTED':
      return labels.done;
    default:
      return labels.unknown;
  }
}

export function getJobPhaseLabelKo(status: AdminJob['status']): string {
  return getJobPhaseLabel(status, 'ko');
}

export function getJobStatusLabel(status: AdminJob['status'], locale: AdminJobLocale = 'ko'): string {
  return STATUS_LABELS[locale][status] ?? status;
}

export function getJobStatusLabelKo(status: AdminJob['status']): string {
  return getJobStatusLabel(status, 'ko');
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
