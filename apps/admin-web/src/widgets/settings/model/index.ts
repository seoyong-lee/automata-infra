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

export const settingsSectionKeys: SettingsSection[] = [
  'general',
  'channels',
  'models',
  'voices',
  'providers',
  'publish-policy',
  'runtime',
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
