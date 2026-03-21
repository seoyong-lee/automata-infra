import type { WorkspaceView } from '../model/types';

/** URL·탭에서 사용하는 콘텐츠 상세 패널(한 번에 하나만 표시). */
export const detailWorkspaceTabKeys = ['script', 'video', 'image', 'upload'] as const;

export type DetailWorkspaceTabKey = (typeof detailWorkspaceTabKeys)[number];

export const detailWorkspaceTabs: Array<{
  key: DetailWorkspaceTabKey;
  label: string;
  description: string;
}> = [
  {
    key: 'script',
    label: '스크립트',
    description: '씬 단위 대본과 구조화된 JSON을 편집합니다.',
  },
  {
    key: 'video',
    label: '영상',
    description: '씬 클립·모션 위주 에셋을 생성합니다.',
  },
  {
    key: 'image',
    label: '이미지',
    description: '씬별 이미지를 생성·보완합니다.',
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
