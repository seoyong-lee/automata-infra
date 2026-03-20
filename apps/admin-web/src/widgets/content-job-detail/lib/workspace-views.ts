import type { WorkspaceView } from '../model/types';

export const workspaceViews: Array<{
  key: WorkspaceView;
  label: string;
  description: string;
}> = [
  {
    key: 'ideation',
    label: '아이데이션',
    description: '제작 1단계: 주제·길이·톤 등 기획 입력을 정합니다.',
  },
  {
    key: 'script',
    label: '스크립트 및 JSON',
    description: '제작 2단계: 씬 단위 대본과 구조화된 JSON을 확정합니다.',
  },
  {
    key: 'image',
    label: '이미지 생성',
    description: '제작 3단계: 씬별 이미지를 생성·보완합니다.',
  },
  {
    key: 'voice',
    label: '음성 생성',
    description: '제작 4단계: 나레이션·TTS를 생성합니다.',
  },
  {
    key: 'video',
    label: '영상 생성',
    description: '제작 5단계: 씬 클립·모션 위주 에셋을 생성합니다.',
  },
  {
    key: 'review',
    label: '렌더링 및 검수',
    description: '제작 6단계: 최종 렌더와 품질 검수를 진행합니다.',
  },
  {
    key: 'upload',
    label: '업로드',
    description: '제작 7단계: 배포·공개 설정 후 발행합니다.',
  },
];

export const workspaceViewKeys: WorkspaceView[] = workspaceViews.map((v) => v.key);

export function parseWorkspaceViewParam(param: string | undefined): WorkspaceView | null {
  if (!param) {
    return null;
  }
  return workspaceViewKeys.includes(param as WorkspaceView) ? (param as WorkspaceView) : null;
}
