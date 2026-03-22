'use client';

import { getErrorMessage } from '@packages/utils';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

import {
  ContentJobDetailBreadcrumb,
  ContentJobDetailIdeationStudioView,
  ContentJobDetailModeTabs,
  ContentJobDetailStagePanel,
  ContentJobReadinessChecklist,
  ContentJobDetailViewContent,
  ContentJobDetailWorkHeader,
  ContentJobWorkflowBar,
  getJobDetailLegacyRedirect,
  parseAssetStage,
  parseAssetsViewMode,
  parseJobDetailModeParam,
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
  const activeMode = parseJobDetailModeParam(searchParams.get('mode'));
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
    if (activeMode === 'ideation' && stepParam === 'timeline') {
      router.replace(`/jobs/${jobId}/overview?mode=ideation`);
    }
  }, [activeMode, jobId, router, stepParam]);

  const pageData = useContentJobDetailPageData(jobId);
  const { workActionResolution, dispatchWorkAction } = useJobDetailWorkState(jobId, pageData);
  const {
    workflowStages,
    readinessChips,
    currentStage,
    currentStageMeta,
    nextStage,
    nextStageMeta,
  } = useContentJobDetailWorkflowLayout(jobId, activeTab, pageData);
  const workflowHref = `/jobs/${jobId}/${activeTab}`;
  const ideationBaseTab = activeTab === 'timeline' ? 'overview' : activeTab;
  const ideationQuery =
    activeTab === 'assets' && assetsViewMode === 'byKind' ? `&view=byKind&stage=${assetStage}` : '';
  const ideationHref = `/jobs/${jobId}/${ideationBaseTab}?mode=ideation${ideationQuery}`;
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <AdminPageHeader
          backHref={pageData.detailVm.contentLineHref}
          eyebrow={<ContentJobDetailBreadcrumb detail={pageData.detail} />}
          title={pageData.detail?.job.videoTitle?.trim() || '제작 아이템'}
          subtitle="상단에서 현재 모드와 준비 상태를 확인하고, 아래에서 바로 작업합니다."
        />
      </div>
      {!pageData.detailQuery.isLoading ? (
        <section className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <ContentJobDetailWorkHeader
            jobId={jobId}
            detail={pageData.detail}
            resolution={workActionResolution}
            onAction={dispatchWorkAction}
          />
          <div className="border-t border-border pt-5">
            <ContentJobDetailModeTabs
              activeMode={activeMode}
              ideationHref={ideationHref}
              workflowHref={workflowHref}
            />
          </div>
          {activeMode === 'workflow' ? (
            <div className="border-t border-border pt-5">
              <ContentJobWorkflowBar stages={workflowStages} />
            </div>
          ) : null}
          <div className="border-t border-border pt-4">
            <ContentJobReadinessChecklist chips={readinessChips} />
          </div>
        </section>
      ) : null}
      {pageData.detailQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">제작 아이템 초안을 불러오는 중…</p>
      ) : pageData.detailQuery.error ? (
        <p className="text-sm text-destructive">{getErrorMessage(pageData.detailQuery.error)}</p>
      ) : null}
      {!pageData.detailQuery.isLoading && !pageData.detailQuery.error ? (
        activeMode === 'workflow' ? (
          <ContentJobDetailStagePanel
            currentStage={currentStage}
            currentStageMeta={currentStageMeta}
            nextStage={nextStage}
            nextStageMeta={nextStageMeta}
          >
            <ContentJobDetailViewContent
              jobId={jobId}
              activeTab={activeTab}
              assetStage={assetStage}
              assetsViewMode={assetsViewMode}
              pageData={pageData}
              workActionResolution={workActionResolution}
              onWorkAction={dispatchWorkAction}
            />
          </ContentJobDetailStagePanel>
        ) : (
          <ContentJobDetailIdeationStudioView
            jobId={jobId}
            activeTab={activeTab}
            assetStage={assetStage}
            assetsViewMode={assetsViewMode}
            pageData={pageData}
          />
        )
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
