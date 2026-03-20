'use client';

import type { AdminJob } from '@/entities/admin-job';
import type { YoutubeChannelConfig } from '@/entities/youtube-channel';

export type QuickFilterKey = 'all' | 'review' | 'failed' | 'upload-ready';
export type ContentOperationsSectionKey = 'scope' | 'queue' | 'experiments' | 'jobs';

export type ContentCardSummary = {
  contentType: string;
  totalJobs: number;
  draftCount: number;
  failedCount: number;
  reviewCount: number;
  assetReadyCount: number;
  uploadReadyCount: number;
};

export type ContentLineSummary = {
  title: string;
  totalJobs: number;
  failedJobs: number;
  reviewJobs: number;
  uploadedJobs: number;
  activeVariants: number;
  averageDurationSec: number;
  latestUploadedAt: string | null;
  latestUpdatedAt: string | null;
};

export type CompareCandidate = {
  job: AdminJob;
  label: string;
  score: number;
  renderPath: string;
};

export type ExperimentTrack = {
  key: string;
  title: string;
  description: string;
  options: string[];
};

export type SelectedChannelSectionProps = {
  selectedChannel: string;
  selectedChannelConfig?: YoutubeChannelConfig;
};
