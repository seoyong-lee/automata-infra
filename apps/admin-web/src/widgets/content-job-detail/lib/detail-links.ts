import { ADMIN_UNASSIGNED_CONTENT_ID } from '@packages/graphql';

import type { JobDraftDetail } from '../model/types';

const isRealContentId = (contentId: string | null | undefined): contentId is string => {
  return Boolean(contentId && contentId !== ADMIN_UNASSIGNED_CONTENT_ID);
};

export const getContentLineHref = (detail?: JobDraftDetail) => {
  const contentId = detail?.job.contentId;
  if (isRealContentId(contentId)) {
    return `/content/${encodeURIComponent(contentId)}/jobs`;
  }
  return '/jobs';
};

export const getNewJobHref = (detail?: JobDraftDetail) => {
  const contentId = detail?.job.contentId;
  if (isRealContentId(contentId)) {
    return `/content/${encodeURIComponent(contentId)}/jobs/new`;
  }
  return '/jobs/new';
};
