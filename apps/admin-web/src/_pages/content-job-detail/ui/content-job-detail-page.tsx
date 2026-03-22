'use client';

import { getErrorMessage } from '@packages/utils';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

import {
  ContentJobDetailBreadcrumb,
  ContentJobReadinessChecklist,
  ContentJobDetailViewContent,
  ContentJobDetailWorkHeader,
  ContentJobWorkflowBar,
  getJobDetailLegacyRedirect,
  parseAssetStage,
  parseAssetsViewMode,
  parseJobDetailRouteTabParam,
  type JobDetailRouteTabKey,
  useContentJobDetailPageData,
  useContentJobDetailWorkflowLayout,
  useJobDetailWorkState,
} from '@/widgets/content-job-detail';
import { AdminPageHeader } from '@/shared/ui/admin-page-header';

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
    }
  }, [jobId, router, stepParam]);

  const pageData = useContentJobDetailPageData(jobId);
  const { workActionResolution, dispatchWorkAction } = useJobDetailWorkState(jobId, pageData);
  const { workflowStages, readinessChips } = useContentJobDetailWorkflowLayout(
    jobId,
    activeTab,
    pageData,
  );
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <AdminPageHeader
          backHref={pageData.detailVm.contentLineHref}
          eyebrow={<ContentJobDetailBreadcrumb detail={pageData.detail} />}
          title={pageData.detail?.job.videoTitle?.trim() || '제작 아이템'}
          subtitle="상단 워크플로에서 전체 단계를 보고, 준비 상태 칩으로 막힌 이유를 확인한 뒤 하단에서 작업합니다."
        />
      </div>
      {!pageData.detailQuery.isLoading ? (
        <>
          <ContentJobDetailWorkHeader
            jobId={jobId}
            detail={pageData.detail}
            resolution={workActionResolution}
            onAction={dispatchWorkAction}
          />
          <div className="sticky top-0 z-20 space-y-3 border-b border-border bg-background/95 py-3 backdrop-blur supports-backdrop-filter:bg-background/80">
            <ContentJobWorkflowBar stages={workflowStages} />
            <ContentJobReadinessChecklist chips={readinessChips} />
          </div>
        </>
      ) : null}
      {pageData.detailQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">제작 아이템 초안을 불러오는 중…</p>
      ) : pageData.detailQuery.error ? (
        <p className="text-sm text-destructive">{getErrorMessage(pageData.detailQuery.error)}</p>
      ) : null}
      <ContentJobDetailViewContent
        jobId={jobId}
        activeTab={activeTab}
        assetStage={assetStage}
        assetsViewMode={assetsViewMode}
        pageData={pageData}
        workActionResolution={workActionResolution}
        onWorkAction={dispatchWorkAction}
        sameLineNewJobHref={pageData.detailVm.newJobHref}
      />
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
