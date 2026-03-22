/** URL `/jobs/:jobId/:step` 에 대응하는 제작 아이템 상세 탭. */
export const jobDetailRouteTabKeys = [
  'overview',
  'ideation',
  'scene',
  'assets',
  'publish',
  'timeline',
] as const;

export type JobDetailRouteTabKey = (typeof jobDetailRouteTabKeys)[number];
export const jobDetailModeKeys = ['ideation', 'workflow'] as const;
export type JobDetailModeKey = (typeof jobDetailModeKeys)[number];

/** 에셋 탭 내부 서브구간 (`?stage=`). */
export type AssetStage = 'image' | 'voice' | 'video';

export type AssetsViewMode = 'scenes' | 'byKind';

export const jobDetailRouteTabs: Array<{
  key: JobDetailRouteTabKey;
  label: string;
  description: string;
}> = [
  {
    key: 'overview',
    label: '개요',
    description: '상태·채널·진행 단계·주요 지표와 다음 액션을 한눈에 봅니다.',
  },
  {
    key: 'ideation',
    label: '아이데이션',
    description:
      '토픽·시드·플랜을 다룹니다. 하단에 토픽 플랜 단계 실행 기록이 표시됩니다. 후보 비교·채택은 도입 예정입니다.',
  },
  {
    key: 'scene',
    label: '씬 설계',
    description:
      '구조화 요약과 Raw JSON으로 씬 명세를 다룹니다. 씬 버전·채택 UI는 도입 예정입니다.',
  },
  {
    key: 'assets',
    label: '에셋',
    description:
      '씬 단위로 이미지·음성·영상 클립 등을 생성·보완합니다. 상단에 에셋 생성 단계 실행 기록이 표시됩니다.',
  },
  {
    key: 'publish',
    label: '렌더·출고 준비',
    description:
      '프리뷰·최종 렌더·검수와 출고 준비입니다. 실제 업로드·예약은 채널의 출고 큐에서 진행합니다.',
  },
  {
    key: 'timeline',
    label: '실행 이력',
    description:
      '파이프라인 단계별 실행(토픽·씬·에셋)과 원시 타임라인을 봅니다. 채택 스냅샷 연동은 추후 보강됩니다.',
  },
];

export function parseJobDetailRouteTabParam(
  param: string | undefined,
): JobDetailRouteTabKey | null {
  if (!param) {
    return null;
  }
  return jobDetailRouteTabKeys.includes(param as JobDetailRouteTabKey)
    ? (param as JobDetailRouteTabKey)
    : null;
}

export function parseJobDetailModeParam(param: string | null | undefined): JobDetailModeKey {
  return param === 'ideation' ? 'ideation' : 'workflow';
}

/**
 * 이전 URL(`script`, `image`, `review` 등) → 새 경로로 옮길 때 사용.
 * `assets` 단계는 `?stage=` 로 구분한다.
 */
export function getJobDetailLegacyRedirect(
  jobId: string,
  stepParam: string | undefined,
): string | null {
  if (!stepParam) {
    return null;
  }
  switch (stepParam) {
    case 'script':
      return `/jobs/${jobId}/scene`;
    case 'image':
      return `/jobs/${jobId}/assets?stage=image`;
    case 'voice':
      return `/jobs/${jobId}/assets?stage=voice`;
    case 'video':
      return `/jobs/${jobId}/assets?stage=video`;
    case 'review':
    case 'upload':
      return `/jobs/${jobId}/publish`;
    default:
      return null;
  }
}

export function parseAssetStage(raw: string | null): AssetStage {
  if (raw === 'voice' || raw === 'video') {
    return raw;
  }
  return 'image';
}

/** 기본은 씬별 보기. `view=byKind` 또는 레거시 `stage=` 가 있으면 종류별 보기. */
export function parseAssetsViewMode(searchParams: URLSearchParams | null): AssetsViewMode {
  if (!searchParams) {
    return 'scenes';
  }
  if (searchParams.get('view') === 'byKind') {
    return 'byKind';
  }
  const stage = searchParams.get('stage');
  if (stage === 'image' || stage === 'voice' || stage === 'video') {
    return 'byKind';
  }
  return 'scenes';
}

/** @deprecated JobDetailRouteTabKey 를 사용한다. */
export type DetailWorkspaceTabKey = JobDetailRouteTabKey;

/** @deprecated jobDetailRouteTabs 를 사용한다. */
export const detailWorkspaceTabs = jobDetailRouteTabs;

/** @deprecated jobDetailRouteTabKeys 를 사용한다. */
export const detailWorkspaceTabKeys = jobDetailRouteTabKeys;

/** @deprecated parseJobDetailRouteTabParam — 레거시 URL는 getJobDetailLegacyRedirect 로 처리한다. */
export function parseDetailWorkspaceTabParam(
  param: string | undefined,
): JobDetailRouteTabKey | null {
  return parseJobDetailRouteTabParam(param);
}
