import type { AdminJob } from '@/entities/admin-job';
import type { YoutubeChannelConfig } from '@/entities/youtube-channel';

export type QuickFilterKey = 'all' | 'review' | 'failed' | 'upload-ready';

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

export const formatStatusLabel = (status: string) => {
  return status.toLowerCase().replace(/_/g, ' ');
};

export const estimateExperimentScore = (input: {
  status: string;
  autoPublish?: boolean | null;
  retryCount: number;
}) => {
  const statusScore =
    input.status === 'UPLOADED'
      ? 95
      : input.status === 'RENDERED'
        ? 82
        : input.status === 'ASSETS_READY'
          ? 74
          : input.status === 'SCENE_JSON_READY'
            ? 63
            : 48;
  const publishBonus = input.autoPublish ? 4 : 0;
  const retryPenalty = input.retryCount * 3;
  return Math.max(0, statusScore + publishBonus - retryPenalty);
};

export const matchesQuickFilter = (status: string, quickFilter: QuickFilterKey): boolean => {
  switch (quickFilter) {
    case 'review':
      return status === 'REVIEW_PENDING';
    case 'failed':
      return status === 'FAILED' || status === 'REJECTED';
    case 'upload-ready':
      return status === 'RENDERED' || status === 'APPROVED';
    case 'all':
    default:
      return true;
  }
};
