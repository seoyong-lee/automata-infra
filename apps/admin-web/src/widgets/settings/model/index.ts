import type { AdminContent } from '@packages/graphql';

export type SettingsSection =
  | 'general'
  | 'channels'
  | 'models'
  | 'voices'
  | 'providers'
  | 'publish-policy'
  | 'runtime';

export type SettingsSectionCard = {
  key: SettingsSection;
  label: string;
  description: string;
};

export type ChannelSummary = {
  total: number;
  autoPublish: number;
  withPlaylist: number;
  /** 레거시(env-only) 구분은 제거 — 카탈로그 기준으로만 집계 */
  envSource: number;
  dbSource: number;
};

export const settingsSections: SettingsSectionCard[] = [
  {
    key: 'general',
    label: '개요',
    description: '글로벌 운영 원칙과 현재 설정 지형을 요약합니다.',
  },
  {
    key: 'channels',
    label: '채널',
    description: '채널별 유튜브 연결·시크릿·업로드 기본값을 관리합니다.',
  },
  {
    key: 'models',
    label: '모델·프롬프트',
    description: '단계별 모델과 프롬프트 기본값을 관리합니다.',
  },
  {
    key: 'voices',
    label: '보이스',
    description: 'TTS 보이스 라이브러리와 기본 파라미터를 관리합니다.',
  },
  {
    key: 'providers',
    label: '프로바이더',
    description: '외부 provider 연결 책임과 장애 대응 관점을 정리합니다.',
  },
  {
    key: 'publish-policy',
    label: '게시 정책',
    description: '자동 공개, visibility, playlist 등 publish 기본값을 봅니다.',
  },
  {
    key: 'runtime',
    label: '런타임',
    description: '재시도, fallback, 운영 런타임 원칙을 정리합니다.',
  },
];

export const getChannelSummary = (contents: AdminContent[]): ChannelSummary => {
  return {
    total: contents.length,
    autoPublish: contents.filter((c) => c.autoPublishEnabled).length,
    withPlaylist: contents.filter((c) => Boolean(c.playlistId?.trim())).length,
    envSource: 0,
    dbSource: contents.filter((c) => c.youtubeSecretName || c.youtubeUpdatedAt).length,
  };
};
