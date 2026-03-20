export type YoutubeChannelConfigForm = {
  channelId: string;
  youtubeSecretName: string;
  youtubeAccountType: string;
  autoPublishEnabled: boolean;
  defaultVisibility: 'private' | 'unlisted' | 'public';
  defaultCategoryId: string;
  playlistId: string;
};
