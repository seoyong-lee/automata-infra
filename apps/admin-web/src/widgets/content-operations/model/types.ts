import type { YoutubeChannelConfig } from '@/entities/youtube-channel';

export type ContentCardSummary = {
  contentType: string;
  totalJobs: number;
  draftCount: number;
  failedCount: number;
  reviewCount: number;
  assetReadyCount: number;
  uploadReadyCount: number;
};

export type SelectedChannelSectionProps = {
  selectedChannel: string;
  selectedChannelConfig?: YoutubeChannelConfig;
};
