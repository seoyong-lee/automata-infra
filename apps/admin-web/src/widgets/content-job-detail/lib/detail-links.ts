import type { JobDraftDetail } from '../model/types';

export const getContentLineHref = (detail?: JobDraftDetail) => {
  const contentId = detail?.job.contentId;
  if (contentId) {
    return `/content/${encodeURIComponent(contentId)}/jobs`;
  }
  return '/content';
};

export const getNewJobHref = (detail?: JobDraftDetail) => {
  const contentId = detail?.job.contentId;
  if (contentId) {
    return `/content/${encodeURIComponent(contentId)}/jobs/new`;
  }
  return '/content/new';
};
