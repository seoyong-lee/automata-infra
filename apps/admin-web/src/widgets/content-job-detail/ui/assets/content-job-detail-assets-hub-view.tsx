'use client';

import type { AssetGenerationModality, ImageGenerationProvider } from '@packages/graphql';
import { useJobExecutionsQuery } from '@packages/graphql';
import { cn } from '@packages/ui';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { AssetsViewMode } from '../../lib/detail-workspace-tabs';
import type { AssetStage } from '../../model';
import type { ContentJobDetailPageData } from '../../model/useContentJobDetailPageData';
import { buildSceneAssetCards } from '../../model/job-detail-scene-assets';
import { ContentJobDetailStageApprovalWorkbench } from '../stage/content-job-detail-stage-approval-workbench';
import { ContentJobDetailAssetsSummaryBar } from './content-job-detail-assets-summary-bar';
import { ContentJobDetailAssetsView } from './content-job-detail-assets-view';
import { ContentJobDetailRenderPreviewView } from './content-job-detail-render-preview-view';
import { ContentJobDetailSceneAssetsList } from './content-job-detail-scene-assets-list';

const stages: Array<{ stage: AssetStage; label: string }> = [
  { stage: 'image', label: '이미지' },
  { stage: 'voice', label: '음성' },
  { stage: 'video', label: '영상 클립' },
];

type ContentJobDetailAssetsHubViewProps = {
  jobId: string;
  assetStage: AssetStage;
  assetsViewMode: AssetsViewMode;
  pageData: ContentJobDetailPageData;
};

function buildAssetsHref(jobId: string, suffix = ''): string {
  return `/jobs/${jobId}/assets${suffix}`;
}

export function ContentJobDetailAssetsHubView({
  jobId,
  assetStage,
  assetsViewMode,
  pageData,
}: ContentJobDetailAssetsHubViewProps) {
  const tabClass =
    'inline-flex h-9 shrink-0 items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors';

  const execQuery = useJobExecutionsQuery({ jobId }, { enabled: Boolean(jobId) });
  const [imageProvider, setImageProvider] = useState<ImageGenerationProvider>('OPENAI');
  const sceneCards = useMemo(() => buildSceneAssetCards(pageData.detail), [pageData.detail]);
  const assetRunSummary = useMemo(() => {
    const items = execQuery.data ?? [];
    const assetRuns = items.filter((execution) => execution.stageType === 'ASSET_GENERATION');
    const byRecent = (a: (typeof assetRuns)[number], b: (typeof assetRuns)[number]) =>
      new Date(b.completedAt ?? b.startedAt).getTime() -
      new Date(a.completedAt ?? a.startedAt).getTime();
    const latestFailed = [...assetRuns].filter((execution) => execution.status === 'FAILED').sort(byRecent)[0];
    const latestSucceeded = [...assetRuns]
      .filter((execution) => execution.status === 'SUCCEEDED')
      .sort(byRecent)[0];
    const collapseFailure =
      Boolean(latestFailed && latestSucceeded) &&
      new Date(latestSucceeded.completedAt ?? latestSucceeded.startedAt).getTime() >
        new Date(latestFailed.completedAt ?? latestFailed.startedAt).getTime();
    return {
      latestFailed,
      collapseFailure,
    };
  }, [execQuery.data]);

  const runScoped = (input: {
    targetSceneId?: number;
    modality: AssetGenerationModality;
    imageProvider?: ImageGenerationProvider;
  }) => {
    pageData.runAssetGeneration(input);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex flex-wrap gap-2">
          <Link
            href={buildAssetsHref(jobId)}
            scroll={false}
            className={cn(
              tabClass,
              assetsViewMode === 'scenes'
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-background hover:bg-accent hover:text-accent-foreground',
            )}
          >
            씬별 보기
          </Link>
          <Link
            href={buildAssetsHref(jobId, `?view=byKind&stage=${assetStage}`)}
            scroll={false}
            className={cn(
              tabClass,
              assetsViewMode === 'byKind'
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-background hover:bg-accent hover:text-accent-foreground',
            )}
          >
            종류별 보기 (고급)
          </Link>
        </div>
      </div>

      <ContentJobDetailStageApprovalWorkbench
        jobId={jobId}
        stageType="ASSET_GENERATION"
        approvedExecutionId={pageData.detail?.job.approvedAssetExecutionId}
        onApprove={pageData.approvePipelineExecution}
        isApproving={pageData.isApprovingPipelineExecution}
        approveError={pageData.approvePipelineExecutionError}
      />

      {assetRunSummary.latestFailed?.errorMessage ? (
        <details
          open={!assetRunSummary.collapseFailure}
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4"
        >
          <summary className="cursor-pointer list-none text-sm font-medium text-destructive">
            최근 에셋 생성 실패 메시지
            {assetRunSummary.collapseFailure ? (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                마지막 성공 이후 접힘
              </span>
            ) : null}
          </summary>
          <div className="mt-3 space-y-2">
            <p className="text-sm text-destructive/90">{assetRunSummary.latestFailed.errorMessage}</p>
            <p className="text-xs text-muted-foreground">
              자세한 실행 이력은{' '}
              <Link href={`/jobs/${jobId}/timeline`} className="underline underline-offset-4">
                실행 이력
              </Link>
              에서 확인할 수 있습니다.
            </p>
          </div>
        </details>
      ) : null}

      {assetsViewMode === 'scenes' ? (
        <>
          <ContentJobDetailAssetsSummaryBar
            jobId={jobId}
            detail={pageData.detail}
            cards={sceneCards}
            isRunning={pageData.isRunningAssetGeneration}
            isSubmitting={pageData.isSubmittingAssetGeneration}
            error={pageData.runAssetGenerationError}
            imageProvider={imageProvider}
            onImageProviderChange={setImageProvider}
            onRunModality={(input) => runScoped(input)}
          />
          <ContentJobDetailSceneAssetsList
            jobId={jobId}
            cards={sceneCards}
            isRunning={pageData.isRunningAssetGeneration}
            isSubmitting={pageData.isSubmittingAssetGeneration}
            isSelectingImageCandidate={pageData.isSelectingSceneImageCandidate}
            imageProvider={imageProvider}
            onImageProviderChange={setImageProvider}
            onRegenerateScene={({ sceneId, modality, imageProvider }) =>
              runScoped({ targetSceneId: sceneId, modality, imageProvider })
            }
            onSelectImageCandidate={(sceneId, candidateId) =>
              pageData.selectSceneImageCandidate(sceneId, candidateId)
            }
          />
          <ContentJobDetailRenderPreviewView
            detail={pageData.detail}
            readyAssetCount={pageData.detailVm.readyAssetCount}
            workflowPublishHref={`/jobs/${jobId}/publish#cj-publish-review`}
            workflowTimelineHref={`/jobs/${jobId}/timeline`}
            isRunningFinalComposition={pageData.isRunningFinalComposition}
            runFinalCompositionError={pageData.runFinalCompositionError}
            onRunFinalComposition={pageData.runFinalComposition}
          />
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            모달리티만 나눠 보는 고급 모드입니다. 일상 작업은 씬별 보기를 권장합니다.
          </p>
          <div className="flex flex-wrap gap-2 border-b pb-3">
            {stages.map(({ stage, label }) => (
              <Link
                key={stage}
                href={buildAssetsHref(jobId, `?view=byKind&stage=${stage}`)}
                scroll={false}
                className={cn(
                  tabClass,
                  assetStage === stage
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-background hover:bg-accent hover:text-accent-foreground',
                )}
              >
                {label}
              </Link>
            ))}
            <span
              className={cn(
                tabClass,
                'cursor-not-allowed border border-dashed border-border opacity-60',
              )}
              title="BGM·SFX는 이후 스프린트에서 씬 단위 UI와 연동 예정입니다."
            >
              BGM·SFX
            </span>
            <span
              className={cn(
                tabClass,
                'cursor-not-allowed border border-dashed border-border opacity-60',
              )}
              title="자막은 이후 스프린트에서 씬 단위 UI와 연동 예정입니다."
            >
              자막
            </span>
          </div>
          <ContentJobDetailAssetsView
            detail={pageData.detail}
            error={pageData.runAssetGenerationError}
            isRunning={pageData.isRunningAssetGeneration}
            isSubmitting={pageData.isSubmittingAssetGeneration}
            imageProvider={imageProvider}
            onImageProviderChange={setImageProvider}
            onRun={(imageProvider) => pageData.runAssetGeneration({ imageProvider })}
            stage={assetStage}
          />
          <ContentJobDetailRenderPreviewView
            detail={pageData.detail}
            readyAssetCount={pageData.detailVm.readyAssetCount}
            workflowPublishHref={`/jobs/${jobId}/publish#cj-publish-review`}
            workflowTimelineHref={`/jobs/${jobId}/timeline`}
            isRunningFinalComposition={pageData.isRunningFinalComposition}
            runFinalCompositionError={pageData.runFinalCompositionError}
            onRunFinalComposition={pageData.runFinalComposition}
          />
        </>
      )}
    </div>
  );
}
