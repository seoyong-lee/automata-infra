import type { JobDraftDetail } from '../model/types';

export const getContentLineHref = (detail?: JobDraftDetail) => {
  const channelId = detail?.job.channelId;
  const contentType = detail?.contentBrief?.contentType ?? detail?.job.contentType;

  if (!channelId) {
    return '/jobs';
  }
  if (!contentType) {
    return `/jobs?channelId=${encodeURIComponent(channelId)}`;
  }

  return `/jobs?channelId=${encodeURIComponent(channelId)}&contentType=${encodeURIComponent(contentType)}`;
};

export const getNewJobHref = (detail?: JobDraftDetail) => {
  const channelId = encodeURIComponent(detail?.job.channelId ?? '');
  const contentType = detail?.job.contentType;
  return contentType
    ? `/jobs/new?channelId=${channelId}&contentType=${encodeURIComponent(contentType)}`
    : `/jobs/new?channelId=${channelId}`;
};
