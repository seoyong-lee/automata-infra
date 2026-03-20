import type { QuickFilterKey } from '../model/types';

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
