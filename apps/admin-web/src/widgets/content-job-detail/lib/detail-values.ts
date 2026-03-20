import type { JobDraftDetail } from '../model/types';

export const getLayoutPreset = (detail?: JobDraftDetail) => {
  if (detail?.job.contentType === 'daily-total') {
    return 'headline-top';
  }
  if (detail?.job.contentType === 'tarot-daily') {
    return 'fact-card';
  }
  return 'caption-heavy';
};

export const getRendererTrack = (detail?: JobDraftDetail) => {
  return detail?.job.status === 'RENDERED' || detail?.job.status === 'UPLOADED'
    ? 'ShotstackRenderer MVP'
    : 'renderer abstraction ready';
};

export const getPublishMode = (detail?: JobDraftDetail) => {
  return (detail?.contentBrief?.autoPublish ?? detail?.job.autoPublish)
    ? 'Auto publish'
    : 'Needs review';
};

export const getPublishPath = (detail?: JobDraftDetail) => {
  return (detail?.contentBrief?.autoPublish ?? detail?.job.autoPublish)
    ? 'auto publish'
    : 'manual review';
};
