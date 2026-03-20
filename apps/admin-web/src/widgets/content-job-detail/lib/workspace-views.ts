import type { WorkspaceView } from '../model/types';

export const workspaceViews: Array<{
  key: WorkspaceView;
  label: string;
  description: string;
}> = [
  {
    key: 'overview',
    label: 'Overview',
    description: '현재 콘텐츠 라인과 잡 상태를 빠르게 요약합니다.',
  },
  {
    key: 'jobs',
    label: 'Jobs',
    description: 'topic seed, scene JSON, 재생성 액션을 다룹니다.',
  },
  {
    key: 'assets',
    label: 'Assets',
    description: 'scene별 에셋 커버리지와 자산 생성 상태를 확인합니다.',
  },
  {
    key: 'uploads',
    label: 'Uploads',
    description: '업로드 정책, 승인 흐름, publish 액션을 다룹니다.',
  },
  {
    key: 'templates',
    label: 'Templates',
    description: '옵션 트랙과 variant 비교 관점을 정리합니다.',
  },
  {
    key: 'logs',
    label: 'Logs',
    description: '현재 job의 운영 메모와 상태 추적 포인트를 봅니다.',
  },
];
