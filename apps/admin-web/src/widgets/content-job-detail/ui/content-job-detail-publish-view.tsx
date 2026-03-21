'use client';

import type { ContentJobDetailPageData } from '../model/useContentJobDetailPageData';
import { ContentJobDetailRenderReviewView } from './content-job-detail-render-review-view';
import { ContentJobDetailShippingPrepView } from './content-job-detail-shipping-prep-view';

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
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">출고 준비</h2>
        <ContentJobDetailShippingPrepView
          jobId={jobId}
          detail={pageData.detail}
          contentId={pageData.detail?.job.contentId}
          enqueueError={pageData.enqueueToChannelQueueError}
          isEnqueueing={pageData.isEnqueueingToChannelQueue}
          onEnqueueToChannel={pageData.enqueueToChannelQueue}
          onOpenReviews={pageData.openReviews}
          isUploading={pageData.isUploading}
          requestUploadError={pageData.requestUploadError}
          onUpload={pageData.upload}
        />
      </section>
    </div>
  );
}
