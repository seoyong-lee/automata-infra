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
    label: 'General',
    description: 'Summary of workspace-wide defaults, coverage, and operational boundaries.',
  },
  {
    key: 'channels',
    label: 'Channels',
    description: 'Manage YouTube connection defaults, publishing visibility, and upload metadata.',
  },
  {
    key: 'models',
    label: 'Models & Prompts',
    description: 'Configure the core intelligence layer and prompt defaults for each LLM stage.',
  },
  {
    key: 'voices',
    label: 'Voices',
    description: 'Manage reusable TTS voice profiles and tuning defaults.',
  },
  {
    key: 'providers',
    label: 'Providers',
    description: 'Review provider ownership, secret boundaries, and fallback responsibilities.',
  },
  {
    key: 'publish-policy',
    label: 'Publish Policy',
    description: 'Review auto-publish, visibility, and playlist-related workspace defaults.',
  },
  {
    key: 'runtime',
    label: 'Runtime',
    description: 'Document retry strategy, fallback behavior, and runtime control direction.',
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
