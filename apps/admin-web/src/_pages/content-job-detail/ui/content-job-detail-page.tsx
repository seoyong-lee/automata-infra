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
  detailTabKeyToWorkspaceView,
  parseDetailWorkspaceTabParam,
  useContentJobDetailPageData,
  type WorkspaceView,
} from '@/widgets/content-job-detail';
import { AdminPageBack } from '@/shared/ui/admin-page-back';
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
  const parsedTab = parseDetailWorkspaceTabParam(stepParam);
  const activeTab = parsedTab ?? 'ideation';
  const activeView: WorkspaceView = detailTabKeyToWorkspaceView(activeTab);

  useEffect(() => {
    if (!jobId) {
      return;
    }
    if (stepParam === 'status') {
      router.replace('/reviews');
      return;
    }
    if (!stepParam || !parseDetailWorkspaceTabParam(stepParam)) {
      router.replace(`/jobs/${jobId}/ideation`);
    }
  }, [jobId, router, stepParam]);

  const pageData = useContentJobDetailPageData(jobId);
  const jobTitle = pageData.detail?.job.videoTitle?.trim();
  const pageTitle = jobTitle ? jobTitle : '잡 상세';

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <AdminPageHeader
          backHref={pageData.detailVm.contentLineHref}
          eyebrow={<ContentJobDetailBreadcrumb detail={pageData.detail} />}
          title={pageTitle}
          subtitle="토픽·시드에서 방향을 잡은 뒤, 스크립트·미디어·업로드 단계로 진행합니다."
          actions={
            <ContentJobDetailHeaderActions
              detail={pageData.detail}
              newJobHref={pageData.detailVm.newJobHref}
            />
          }
        />
      </div>

      <ContentJobDetailNestedTabs jobId={jobId} activeTab={activeTab} />

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
