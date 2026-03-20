import type { ContextCard, JobDraftDetail } from '../model/types';
import { getPublishMode } from './detail-values';

const getContentLineValue = (detail?: JobDraftDetail) => {
  return detail?.contentBrief?.contentType ?? detail?.job.contentType ?? '-';
};

const getVariantValue = (detail?: JobDraftDetail) => {
  return detail?.contentBrief?.variant ?? detail?.job.variant ?? '-';
};

const getPublishAtValue = (detail?: JobDraftDetail) => {
  return detail?.contentBrief?.publishAt ?? detail?.job.publishAt ?? '-';
};

const getTargetPlatformValue = (detail?: JobDraftDetail) => {
  return detail?.contentBrief?.targetPlatform ?? 'youtube-shorts';
};

export const buildContentJobDetailContextCards = (detail?: JobDraftDetail): ContextCard[] => {
  return [
    {
      label: 'Content line',
      value: getContentLineValue(detail),
    },
    {
      label: 'Variant',
      value: getVariantValue(detail),
    },
    {
      label: 'Publish Mode',
      value: getPublishMode(detail),
    },
    {
      label: 'Publish At',
      value: getPublishAtValue(detail),
    },
    {
      label: 'Target Platform',
      value: getTargetPlatformValue(detail),
    },
  ];
};
