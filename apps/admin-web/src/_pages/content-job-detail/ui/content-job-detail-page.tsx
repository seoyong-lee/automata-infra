'use client';

import { getErrorMessage } from '@packages/utils';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

import { AdminPageHeader } from '@/shared/ui/admin-page-header';
import { AdminWorkspaceTopbar } from '@/shared/ui/admin-workspace-topbar';
import {
  getJobDetailLegacyRedirect,
  parseAssetStage,
  parseAssetsViewMode,
  parseJobDetailRouteTabParam,
  type JobDetailRouteTabKey,
} from '@/widgets/content-job-detail/lib/detail-workspace-tabs';
import { useContentJobDetailWorkflowLayout } from '@/widgets/content-job-detail/model/useContentJobDetailWorkflowLayout';
import { useContentJobDetailPageData } from '@/widgets/content-job-detail/model/useContentJobDetailPageData';
import { useJobDetailWorkState } from '@/widgets/content-job-detail/model/useJobDetailWorkState';
import { ContentJobReadinessChecklist } from '@/widgets/content-job-detail/ui/shell/content-job-readiness-checklist';
import { ContentJobDetailBreadcrumb } from '@/widgets/content-job-detail/ui/shell/content-job-detail-breadcrumb';
import { ContentJobDetailStagePanel } from '@/widgets/content-job-detail/ui/shell/content-job-detail-stage-panel';
import { ContentJobDetailViewContent } from '@/widgets/content-job-detail/ui/shell/content-job-detail-view-content';
import { ContentJobWorkflowBar } from '@/widgets/content-job-detail/ui/shell/content-job-workflow-bar';
import { ContentJobDetailWorkHeader } from '@/widgets/content-job-detail/ui/work-header/content-job-detail-work-header';

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
  const {
    workflowStages,
    readinessChips,
    currentStage,
    currentStageMeta,
    nextStage,
    nextStageMeta,
  } = useContentJobDetailWorkflowLayout(jobId, activeTab, pageData);
  const contentId = pageData.detail?.job.contentId?.trim();
  const currentStageLabel = currentStageMeta?.title ?? currentStage?.label ?? '개요';
  const nextStageLabel = nextStageMeta?.title ?? nextStage?.label ?? '마지막 단계';

  return (
    <div className="space-y-6">
      <AdminWorkspaceTopbar
        eyebrow="Workbench"
        title="제작 아이템 워크벤치"
        description="현재 단계, 준비 상태, 다음 행동을 상단에서 먼저 확인하고 각 탭에서 세부 작업을 이어갑니다."
        links={[
          {
            href: pageData.detailVm.contentLineHref,
            label: '채널',
            value: contentId || '미연결',
          },
          {
            href: currentStage?.href ?? `/jobs/${jobId}/overview`,
            label: '현재 단계',
            value: currentStageLabel,
          },
          {
            href: nextStage?.href ?? `/jobs/${jobId}/overview`,
            label: '다음 단계',
            value: nextStageLabel,
          },
        ]}
      />
      {!pageData.detailQuery.isLoading ? (
        <section className="admin-page-shell space-y-6 overflow-hidden p-6">
          <AdminPageHeader
            backHref={pageData.detailVm.contentLineHref}
            eyebrow={<ContentJobDetailBreadcrumb detail={pageData.detail} />}
            title={pageData.detail?.job.videoTitle?.trim() || '제작 아이템'}
            subtitle="상단 작업대에서 현재 상태와 다음 흐름을 먼저 정리한 뒤, 아래 본문에서 단계별 작업을 이어갑니다."
          />
          <ContentJobDetailWorkHeader
            jobId={jobId}
            detail={pageData.detail}
            resolution={workActionResolution}
            onAction={dispatchWorkAction}
          />
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
            <div className="space-y-6">
              <ContentJobWorkflowBar stages={workflowStages} />
              <ContentJobReadinessChecklist chips={readinessChips} />
            </div>
            <div className="admin-section-shell p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-admin-primary">
                Work Summary
              </p>
              <div className="mt-3 space-y-3 text-sm leading-6 text-admin-text-muted">
                <p>
                  현재 단계:{' '}
                  <span className="font-medium text-admin-text-strong">{currentStageLabel}</span>
                </p>
                <p>
                  다음 단계:{' '}
                  <span className="font-medium text-admin-text-strong">{nextStageLabel}</span>
                </p>
                <p>필요한 readiness 항목은 아래 칩에서 바로 이동해 확인할 수 있습니다.</p>
              </div>
            </div>
          </div>
        </section>
      ) : null}
      {pageData.detailQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">제작 아이템 초안을 불러오는 중…</p>
      ) : pageData.detailQuery.error ? (
        <p className="text-sm text-destructive">{getErrorMessage(pageData.detailQuery.error)}</p>
      ) : null}
      {!pageData.detailQuery.isLoading && !pageData.detailQuery.error ? (
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
