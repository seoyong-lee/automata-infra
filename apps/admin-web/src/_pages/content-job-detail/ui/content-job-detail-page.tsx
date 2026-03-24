'use client';

import { getErrorMessage } from '@packages/utils';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

import {
  getJobDetailLegacyRedirect,
  parseAssetStage,
  parseAssetsViewMode,
  parseJobDetailRouteTabParam,
  type JobDetailRouteTabKey,
} from '@/widgets/content-job-detail/lib/detail-workspace-tabs';
import { buildContentJobDetailShellViewModel } from '@/widgets/content-job-detail/model';
import { useContentJobDetailWorkflowLayout } from '@/widgets/content-job-detail/model/useContentJobDetailWorkflowLayout';
import { useContentJobDetailPageData } from '@/widgets/content-job-detail/model/useContentJobDetailPageData';
import { useJobDetailWorkState } from '@/widgets/content-job-detail/model/useJobDetailWorkState';
import { ContentJobDetailLayout } from '@/widgets/content-job-detail/ui/shell/content-job-detail-layout';
import { ContentJobDetailViewContent } from '@/widgets/content-job-detail/ui/shell/content-job-detail-view-content';

// eslint-disable-next-line complexity, max-lines-per-function -- 라우트 동기화·워크플로·본문 한 화면
function ContentJobDetailPageBody() {
  const params = useParams<{
    jobId: string | string[] | undefined;
    step: string | string[] | undefined;
  }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawJobId = params?.jobId;
  const jobId = (Array.isArray(rawJobId) ? rawJobId[0] : rawJobId) ?? '';
  const rawStep = params?.step;
  const stepParam = Array.isArray(rawStep) ? rawStep[0] : rawStep;
  const assetStage = parseAssetStage(searchParams.get('stage'));
  const assetsViewMode = parseAssetsViewMode(searchParams);
  const parsedTab = parseJobDetailRouteTabParam(stepParam);
  const activeTab: JobDetailRouteTabKey = parsedTab ?? 'overview';
  useEffect(() => {
    if (!jobId) {
      return;
    }
    if (stepParam === 'status') {
      router.replace('/reviews');
      return;
    }
    const legacy = getJobDetailLegacyRedirect(jobId, stepParam);
    if (legacy) {
      router.replace(legacy);
      return;
    }
    if (!stepParam || !parseJobDetailRouteTabParam(stepParam)) {
      router.replace(`/jobs/${jobId}/overview`);
      return;
    }
  }, [jobId, router, stepParam]);

  const pageData = useContentJobDetailPageData(jobId);
  const { workActionResolution, dispatchWorkAction } = useJobDetailWorkState(jobId, pageData);
  useContentJobDetailWorkflowLayout(jobId, activeTab, pageData);
  const shellVm = buildContentJobDetailShellViewModel({
    jobId,
    activeTab,
    job: pageData.detail?.job,
    workActionResolution,
  });

  return (
    <div className="space-y-6">
      {pageData.detailQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">제작 아이템 초안을 불러오는 중…</p>
      ) : pageData.detailQuery.error ? (
        <p className="text-sm text-destructive">{getErrorMessage(pageData.detailQuery.error)}</p>
      ) : null}
      {!pageData.detailQuery.isLoading && !pageData.detailQuery.error ? (
        <ContentJobDetailLayout jobId={jobId} shellVm={shellVm} onAction={dispatchWorkAction}>
          <ContentJobDetailViewContent
            jobId={jobId}
            activeTab={activeTab}
            assetStage={assetStage}
            assetsViewMode={assetsViewMode}
            pageData={pageData}
            workActionResolution={workActionResolution}
            onWorkAction={dispatchWorkAction}
          />
        </ContentJobDetailLayout>
      ) : null}
    </div>
  );
}

export function ContentJobDetailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">화면을 불러오는 중…</p>}>
      <ContentJobDetailPageBody />
    </Suspense>
  );
}
