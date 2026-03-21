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

/** 에셋 탭 내부 서브구간 (`?stage=`). */
export type AssetStage = 'image' | 'voice' | 'video';

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
    description: '토픽·시드·플랜 방향을 잡고, 후보를 만들고 채택하는 단계입니다.',
  },
  {
    key: 'scene',
    label: '씬 설계',
    description: 'brief·씬 JSON을 확정합니다. 렌더 중립 명세의 중심 단계입니다.',
  },
  {
    key: 'assets',
    label: '에셋',
    description: '씬 단위로 이미지·음성·영상 클립 등을 생성·보완합니다.',
  },
  {
    key: 'publish',
    label: '렌더·업로드',
    description: '프리뷰·최종 렌더와 메타·예약·플랫폼 업로드를 다룹니다.',
  },
  {
    key: 'timeline',
    label: '실행 이력',
    description: '이 제작 아이템에 기록된 타임라인·감사 이벤트를 조회합니다.',
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
