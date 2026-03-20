import type { ContentOperationsSectionKey, ExperimentTrack, QuickFilterKey } from '../model/types';

export const quickFilterMeta: Array<{
  key: QuickFilterKey;
  label: string;
  description: string;
}> = [
  {
    key: 'all',
    label: 'All Jobs',
    description: '전체 잡과 현재 콘텐츠 라인의 상태를 함께 봅니다.',
  },
  {
    key: 'review',
    label: 'Review Queue',
    description: '사람 확인이 필요한 잡만 빠르게 모아봅니다.',
  },
  {
    key: 'failed',
    label: 'Failed',
    description: '실패하거나 재실행이 필요한 잡을 우선 확인합니다.',
  },
  {
    key: 'upload-ready',
    label: 'Upload Ready',
    description: '렌더 완료 후 업로드/승인 대기 상태를 추립니다.',
  },
];

export const experimentTracks: ExperimentTrack[] = [
  {
    key: 'scene-package',
    title: 'Scene Package',
    description: 'structured script -> scene timeline -> editable scene JSON',
    options: ['headline-top', 'fact-card', 'caption-heavy'],
  },
  {
    key: 'assets',
    title: 'Asset Strategy',
    description: 'bg video / bg image fallback / TTS / caption style mix',
    options: ['video-first', 'image-fallback', 'tts-balanced'],
  },
  {
    key: 'renderer',
    title: 'Renderer',
    description: 'renderer abstraction behind the same scene package contract',
    options: ['shotstack-mvp', 'ffmpeg-spike', 'hybrid-review'],
  },
  {
    key: 'review',
    title: 'Review / Publish',
    description: 'review-first, light rerender, full rerender, manual vs auto publish',
    options: ['review-first', 'light-rerender', 'auto-publish'],
  },
];

export const contentOperationsSections: Array<{
  key: ContentOperationsSectionKey;
  label: string;
  description: string;
}> = [
  {
    key: 'scope',
    label: 'Scope',
    description: '채널과 콘텐츠 라인 범위를 정하고 현재 운영 단위를 선택합니다.',
  },
  {
    key: 'queue',
    label: 'Queue',
    description: '선택한 콘텐츠 라인의 운영 현황과 현재 잡 패널을 확인합니다.',
  },
  {
    key: 'experiments',
    label: 'Experiments',
    description: '옵션 트랙과 variant 비교로 실험 방향을 검토합니다.',
  },
  {
    key: 'jobs',
    label: 'Jobs',
    description: '필터링된 잡 목록에서 실제 운영 대상을 고르고 drill-in 합니다.',
  },
];
