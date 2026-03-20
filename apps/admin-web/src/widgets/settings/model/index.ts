import type { YoutubeChannelConfig } from '@/entities/youtube-channel';

export type SettingsSection =
  | 'general'
  | 'channels'
  | 'models'
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
  envSource: number;
  dbSource: number;
};

export const settingsSections: SettingsSectionCard[] = [
  {
    key: 'general',
    label: 'General',
    description: '글로벌 운영 원칙과 현재 설정 지형을 요약합니다.',
  },
  {
    key: 'channels',
    label: 'Channels',
    description: '채널 연결, 시크릿, 업로드 기본값을 관리합니다.',
  },
  {
    key: 'models',
    label: 'Models & Prompts',
    description: '단계별 모델과 프롬프트 기본값을 관리합니다.',
  },
  {
    key: 'providers',
    label: 'Providers',
    description: '외부 provider 연결 책임과 장애 대응 관점을 정리합니다.',
  },
  {
    key: 'publish-policy',
    label: 'Publish Policy',
    description: '자동 공개, visibility, playlist 등 publish 기본값을 봅니다.',
  },
  {
    key: 'runtime',
    label: 'Runtime',
    description: '재시도, fallback, 운영 런타임 원칙을 정리합니다.',
  },
];

export const getChannelSummary = (youtubeConfigs: YoutubeChannelConfig[]): ChannelSummary => {
  return {
    total: youtubeConfigs.length,
    autoPublish: youtubeConfigs.filter((config) => config.autoPublishEnabled).length,
    withPlaylist: youtubeConfigs.filter((config) => Boolean(config.playlistId)).length,
    envSource: youtubeConfigs.filter((config) => config.source === 'env').length,
    dbSource: youtubeConfigs.filter((config) => config.source === 'db').length,
  };
};
