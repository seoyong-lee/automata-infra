import type { WorkspaceView } from '../model/types';

/** URL·탭에서 사용하는 콘텐츠 상세 패널(한 번에 하나만 표시). */
export const detailWorkspaceTabKeys = ['ideation', 'script', 'video', 'image', 'upload'] as const;

export type DetailWorkspaceTabKey = (typeof detailWorkspaceTabKeys)[number];

export const detailWorkspaceTabs: Array<{
  key: DetailWorkspaceTabKey;
  label: string;
  description: string;
}> = [
  {
    key: 'ideation',
    label: '토픽·시드',
    description:
      '제목·길이·톤 등 자연어 입력으로 토픽을 다듬고, 필요 시 토픽 플랜을 다시 돌립니다.',
  },
  {
    key: 'script',
    label: '스크립트',
    description: '씬 단위 대본과 구조화된 JSON을 편집합니다.',
  },
  {
    key: 'image',
    label: '이미지',
    description: '씬별 이미지를 생성·보완합니다.',
  },
  {
    key: 'video',
    label: '영상',
    description: '씬 클립·모션 위주 에셋을 생성합니다.',
  },
  {
    key: 'upload',
    label: '업로드',
    description: '배포·공개 설정 후 발행합니다.',
  },
];

export function parseDetailWorkspaceTabParam(
  param: string | undefined,
): DetailWorkspaceTabKey | null {
  if (!param) {
    return null;
  }
  return detailWorkspaceTabKeys.includes(param as DetailWorkspaceTabKey)
    ? (param as DetailWorkspaceTabKey)
    : null;
}

export function detailTabKeyToWorkspaceView(key: DetailWorkspaceTabKey): WorkspaceView {
  return key as WorkspaceView;
}
