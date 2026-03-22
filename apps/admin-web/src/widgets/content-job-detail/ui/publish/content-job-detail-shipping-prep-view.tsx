'use client';

import { ADMIN_UNASSIGNED_CONTENT_ID } from '@packages/graphql';

import type { JobDraftDetail } from '../../model';
import { ShippingPrepEnqueueCard } from './content-job-detail-shipping-prep-enqueue-card';

type ContentJobDetailShippingPrepViewProps = {
  detail?: JobDraftDetail;
  contentId?: string | null;
  isEnqueueing: boolean;
  enqueueError: unknown;
  onEnqueueToChannel: (contentId: string) => void;
  onOpenReviews: () => void;
};

export function ContentJobDetailShippingPrepView({
  detail,
  contentId,
  isEnqueueing,
  enqueueError,
  onEnqueueToChannel,
  onOpenReviews,
}: ContentJobDetailShippingPrepViewProps) {
  const channelOk = Boolean(contentId) && contentId !== ADMIN_UNASSIGNED_CONTENT_ID;
  const queueHref = channelOk ? `/content/${encodeURIComponent(contentId!)}/queue` : null;
  const scheduleHref = channelOk ? `/content/${encodeURIComponent(contentId!)}/schedule` : null;

  return (
    <div className="space-y-6">
      <ShippingPrepEnqueueCard
        detail={detail}
        channelOk={channelOk}
        queueHref={queueHref}
        scheduleHref={scheduleHref}
        contentId={contentId}
        isEnqueueing={isEnqueueing}
        enqueueError={enqueueError}
        onEnqueueToChannel={onEnqueueToChannel}
        onOpenReviews={onOpenReviews}
      />
    </div>
  );
}
