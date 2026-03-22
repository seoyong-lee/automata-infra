'use client';

import type { ContentJobDetailPageData } from '../../model/useContentJobDetailPageData';
import { ContentJobDetailRenderReviewView } from './content-job-detail-render-review-view';
import { ContentJobDetailShippingPrepView } from './content-job-detail-shipping-prep-view';
import { ContentPublishDraftSection } from './content-publish-draft-section';

type ContentJobDetailPublishViewProps = {
  jobId: string;
  pageData: ContentJobDetailPageData;
};

/** 렌더·검수와 출고 준비(채널 큐)를 한 탭에서 다룬다. */
export function ContentJobDetailPublishView({ jobId, pageData }: ContentJobDetailPublishViewProps) {
  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">렌더·검수</h2>
        <ContentJobDetailRenderReviewView
          detail={pageData.detail}
          onOpenReviews={pageData.openReviews}
          readyAssetCount={pageData.detailVm.readyAssetCount}
        />
      </section>
      <section className="space-y-6">
        <h2 className="text-lg font-semibold">출고 준비</h2>
        <ContentPublishDraftSection
          jobId={jobId}
          contentId={pageData.detail?.job.contentId}
          fallbackTitle={pageData.detail?.job.videoTitle?.trim() ?? ''}
        />
        <ContentJobDetailShippingPrepView
          detail={pageData.detail}
          contentId={pageData.detail?.job.contentId}
          enqueueError={pageData.enqueueToChannelQueueError}
          isEnqueueing={pageData.isEnqueueingToChannelQueue}
          onEnqueueToChannel={pageData.enqueueToChannelQueue}
          onOpenReviews={pageData.openReviews}
        />
      </section>
    </div>
  );
}
