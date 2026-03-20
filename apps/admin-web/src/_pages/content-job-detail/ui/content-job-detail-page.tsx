'use client';

import { getErrorMessage } from '@packages/utils';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import {
  ContentJobDetailBreadcrumb,
  ContentJobDetailHeaderActions,
  ContentJobDetailNestedTabs,
  ContentJobDetailViewContent,
  parseWorkspaceViewParam,
  useContentJobDetailPageData,
  type WorkspaceView,
} from '@/widgets/content-job-detail';
import { AdminPageHeader } from '@/shared/ui/admin-page-header';

export function ContentJobDetailPage() {
  const params = useParams<{
    jobId: string | string[] | undefined;
    step: string | string[] | undefined;
  }>();
  const router = useRouter();
  const rawJobId = params?.jobId;
  const jobId = (Array.isArray(rawJobId) ? rawJobId[0] : rawJobId) ?? '';
  const rawStep = params?.step;
  const stepParam = Array.isArray(rawStep) ? rawStep[0] : rawStep;
  const parsed = parseWorkspaceViewParam(stepParam);
  const activeView: WorkspaceView = parsed ?? 'ideation';

  useEffect(() => {
    if (!jobId) {
      return;
    }
    if (stepParam === 'status') {
      router.replace('/reviews');
      return;
    }
    if (!stepParam || !parseWorkspaceViewParam(stepParam)) {
      router.replace(`/jobs/${jobId}/ideation`);
    }
  }, [jobId, router, stepParam]);

  const pageData = useContentJobDetailPageData(jobId);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow={
          <ContentJobDetailBreadcrumb
            contentLineHref={pageData.detailVm.contentLineHref}
            detail={pageData.detail}
          />
        }
        title="콘텐츠 상세"
        subtitle="영역·세부 탭을 고르면 아래에 해당 단계 편집 영역만 표시됩니다."
        actions={
          <>
            <Link
              href="/reviews"
              className="inline-flex h-9 items-center justify-center rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
            >
              작업 현황
            </Link>
            <ContentJobDetailHeaderActions
              contentLineHref={pageData.detailVm.contentLineHref}
              detail={pageData.detail}
              newJobHref={pageData.detailVm.newJobHref}
            />
          </>
        }
      />

      <ContentJobDetailNestedTabs jobId={jobId} activeView={activeView} />

      {pageData.detailQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading job draft...</p>
      ) : null}
      {pageData.detailQuery.error ? (
        <p className="text-sm text-destructive">{getErrorMessage(pageData.detailQuery.error)}</p>
      ) : null}

      <ContentJobDetailViewContent activeView={activeView} pageData={pageData} />
    </div>
  );
}
