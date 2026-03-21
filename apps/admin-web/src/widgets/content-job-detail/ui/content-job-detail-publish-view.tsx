'use client';

import type { ContentJobDetailPageData } from '../model/useContentJobDetailPageData';
import { ContentJobDetailRenderReviewView } from './content-job-detail-render-review-view';
import { ContentJobDetailUploadsView } from './content-job-detail-uploads-view';

type ContentJobDetailPublishViewProps = {
  pageData: ContentJobDetailPageData;
};

/** 렌더·검수와 업로드·발행을 한 탭에서 다루되, 섹션은 분리한다. */
export function ContentJobDetailPublishView({ pageData }: ContentJobDetailPublishViewProps) {
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
        <h2 className="text-lg font-semibold">업로드·발행</h2>
        <ContentJobDetailUploadsView
          detail={pageData.detail}
          error={pageData.requestUploadError}
          isUploading={pageData.isUploading}
          onOpenReviews={pageData.openReviews}
          onUpload={pageData.upload}
        />
      </section>
    </div>
  );
}
