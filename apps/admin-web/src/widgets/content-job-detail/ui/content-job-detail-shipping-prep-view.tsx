'use client';

import { ADMIN_UNASSIGNED_CONTENT_ID } from '@packages/graphql';

import type { JobDraftDetail } from '../model';
import { ShippingPrepDirectUploadCard } from './content-job-detail-shipping-prep-direct-upload-card';
import { ShippingPrepEnqueueCard } from './content-job-detail-shipping-prep-enqueue-card';

type ContentJobDetailShippingPrepViewProps = {
  jobId: string;
  detail?: JobDraftDetail;
  contentId?: string | null;
  isEnqueueing: boolean;
  enqueueError: unknown;
  onEnqueueToChannel: (contentId: string) => void;
  onOpenReviews: () => void;
  isUploading: boolean;
  requestUploadError: unknown;
  onUpload: () => void;
};

export function ContentJobDetailShippingPrepView({
  jobId,
  detail,
  contentId,
  isEnqueueing,
  enqueueError,
  onEnqueueToChannel,
  onOpenReviews,
  isUploading,
  requestUploadError,
  onUpload,
}: ContentJobDetailShippingPrepViewProps) {
  const channelOk = Boolean(contentId) && contentId !== ADMIN_UNASSIGNED_CONTENT_ID;
  const queueHref = channelOk ? `/content/${encodeURIComponent(contentId!)}/queue` : null;

  return (
    <div className="space-y-6">
      <ShippingPrepEnqueueCard
        detail={detail}
        channelOk={channelOk}
        queueHref={queueHref}
        contentId={contentId}
        isEnqueueing={isEnqueueing}
        enqueueError={enqueueError}
        onEnqueueToChannel={onEnqueueToChannel}
        onOpenReviews={onOpenReviews}
      />
      <ShippingPrepDirectUploadCard
        jobId={jobId}
        isUploading={isUploading}
        requestUploadError={requestUploadError}
        onUpload={onUpload}
      />
    </div>
  );
}
