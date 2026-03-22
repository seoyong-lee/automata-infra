'use client';

import { getErrorMessage } from '@packages/utils';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

import {
  ContentJobDetailBreadcrumb,
  ContentJobDetailNestedTabs,
  ContentJobDetailViewContent,
  ContentJobDetailWorkHeader,
  getJobDetailLegacyRedirect,
  jobDetailRouteTabs,
  parseAssetStage,
  parseJobDetailRouteTabParam,
  type JobDetailRouteTabKey,
  useContentJobDetailPageData,
  useJobDetailWorkState,
} from '@/widgets/content-job-detail';
import { AdminPageHeader } from '@/shared/ui/admin-page-header';

// eslint-disable-next-line complexity -- 라우트 동기화·로딩·탭·본문 한 화면에 묶음
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
  const jobTitle = pageData.detail?.job.videoTitle?.trim();
  const pageTitle = jobTitle ? jobTitle : '제작 아이템';
  const tabDescription = jobDetailRouteTabs.find((t) => t.key === activeTab)?.description;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <AdminPageHeader
          backHref={pageData.detailVm.contentLineHref}
          eyebrow={<ContentJobDetailBreadcrumb detail={pageData.detail} />}
          title={pageTitle}
          subtitle={
            tabDescription ?? '상단에서 상태와 다음 작업을 확인하고, 탭으로 세부 단계를 다룹니다.'
          }
        />
      </div>

      {pageData.detailQuery.isLoading ? null : (
        <ContentJobDetailWorkHeader
          jobId={jobId}
          detail={pageData.detail}
          resolution={workActionResolution}
          onAction={dispatchWorkAction}
        />
      )}

      <ContentJobDetailNestedTabs jobId={jobId} activeTab={activeTab} />

      {pageData.detailQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">제작 아이템 초안을 불러오는 중…</p>
      ) : null}
      {pageData.detailQuery.error ? (
        <p className="text-sm text-destructive">{getErrorMessage(pageData.detailQuery.error)}</p>
      ) : null}

      <ContentJobDetailViewContent
        jobId={jobId}
        activeTab={activeTab}
        assetStage={assetStage}
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
